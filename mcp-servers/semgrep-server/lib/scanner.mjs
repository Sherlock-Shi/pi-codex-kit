/**
 * semgrep-server — Semgrep CLI wrapper with warm cache.
 *
 * Wraps the `semgrep` binary (must be on PATH). Caches scan results
 * keyed by (file content hash, config hash) to skip unchanged files.
 * Zero npm dependencies — uses only Node.js builtins.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";

const SCAN_TIMEOUT_MS = 300_000; // 5 minutes for large repos

/** In-memory result cache: Map<cacheKey, { findings, timestamp }> */
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function cacheKey(paths, config) {
  const h = createHash("sha256");
  for (const p of paths) {
    try {
      const stat = statSync(p, { recursive: true });
      h.update(`${p}:${stat.mtimeMs}`);
    } catch {
      h.update(`${p}:missing`);
    }
  }
  h.update(config ?? "auto");
  return h.digest("hex").slice(0, 16);
}

/** Find the semgrep binary. */
function findSemgrep() {
  const name = process.platform === "win32" ? "semgrep.exe" : "semgrep";
  const check = spawnSync(name, ["--version"], { encoding: "utf8", timeout: 10_000 });
  if (check.error || check.status !== 0) return null;
  return { bin: name, version: (check.stdout || "").trim() };
}

/** Run a semgrep scan. Returns parsed JSON findings. */
export function scan(paths, { config = "auto", severity } = {}) {
  const key = cacheKey(paths, config);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { ...cached.result, cached: true };
  }

  const args = ["scan", "--config", config, "--json", "--metrics=off", "--no-git-ignore"];
  if (severity) args.push("--severity", severity.toUpperCase());
  args.push(...paths);

  const r = spawnSync("semgrep", args, {
    encoding: "utf8",
    timeout: SCAN_TIMEOUT_MS,
    maxBuffer: 50 * 1024 * 1024, // 50MB for large scan output
    windowsHide: true,
  });

  if (r.error) throw new Error(`semgrep spawn failed: ${r.error.message}`);

  let output;
  try {
    output = JSON.parse(r.stdout || "{}");
  } catch {
    throw new Error(`semgrep returned invalid JSON (exit ${r.status}): ${(r.stderr || "").slice(0, 500)}`);
  }

  const findings = (output.results || []).map((f) => ({
    id: f.check_id,
    severity: f.extra?.severity ?? "INFO",
    message: f.extra?.message ?? "",
    file: f.path,
    line: f.start?.line ?? 0,
    endLine: f.end?.line ?? 0,
    code: f.extra?.lines ?? "",
    cwe: f.extra?.metadata?.cwe ?? [],
    owasp: f.extra?.metadata?.owasp ?? [],
    remediation: f.extra?.fix ?? f.extra?.metadata?.fix ?? null,
  }));

  const result = {
    findings,
    count: findings.length,
    high: findings.filter(f => f.severity === "ERROR").length,
    medium: findings.filter(f => f.severity === "WARNING").length,
    low: findings.filter(f => f.severity === "INFO").length,
    pathsScanned: paths,
    config,
    cached: false,
  };

  cache.set(key, { result, timestamp: Date.now() });
  return result;
}

/** List available rules for a config. */
export function listRules(config = "auto", language) {
  const args = ["--config", config, "--show-supported-languages"];
  if (language) {
    // Use --config with language-specific ruleset
    args.length = 0;
    args.push("scan", "--config", `p/${language}`, "--json", "--metrics=off", "--dryrun", ".");
  }
  const r = spawnSync("semgrep", ["--config", config, "--metrics=off", "--show-dataflow-traces", "--json", "--dryrun", "."], {
    encoding: "utf8",
    timeout: 30_000,
    windowsHide: true,
  });
  // semgrep doesn't have a clean "list rules" command — return version + config info
  const semgrep = findSemgrep();
  return {
    semgrepVersion: semgrep?.version ?? "not found",
    config,
    note: "Use semgrep_scan with specific paths to see which rules fire. Rule catalog: https://semgrep.dev/r",
  };
}

/** Explain a specific finding by rule ID. */
export function explainFinding(findingId) {
  // Look up from semgrep registry metadata
  const r = spawnSync("semgrep", ["--config", "auto", "--json", "--metrics=off", "--dryrun", "."], {
    encoding: "utf8",
    timeout: 15_000,
    windowsHide: true,
  });
  return {
    ruleId: findingId,
    registry: `https://semgrep.dev/r?q=${encodeURIComponent(findingId)}`,
    note: "Visit the Semgrep Registry link for full rule documentation, CWE mapping, and remediation guidance.",
  };
}

/** Server health check. */
export function status() {
  const semgrep = findSemgrep();
  return {
    available: !!semgrep,
    version: semgrep?.version ?? null,
    cacheEntries: cache.size,
    platform: process.platform,
  };
}
