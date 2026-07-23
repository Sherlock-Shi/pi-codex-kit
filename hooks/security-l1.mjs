#!/usr/bin/env node
/**
 * pi-codex-kit — L1 Static Security Check (PostToolUse hook).
 *
 * Fires after every code-writing tool (apply_patch, Edit, Write).
 * Pattern-matches the edited file for high-risk patterns and injects
 * a warning into the agent's context. Near-zero cost (regex only).
 *
 * Aligned with Qoder Security Tier L1: "automatically during coding."
 * Disable per-session with CODEX_KIT_SECURITY_L1=0.
 * NON-BLOCKING: any error exits 0 with no stdout.
 */
import { readFileSync } from "node:fs";

const MAX_STDIN_BYTES = 1024 * 1024; // 1 MB cap
const MAX_FILE_READ = 512 * 1024; // Only scan files < 512KB

/**
 * L1 patterns: high-precision, low false-positive.
 * These catch the "obvious risk" class that should never land in a file.
 */
const L1_PATTERNS = [
  { id: "eval-usage", regex: /\beval\s*\(/, msg: "eval() detected — use structured parsing instead" },
  { id: "hardcoded-secret", regex: /(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|AKIA[A-Z0-9]{16})/, msg: "Possible hardcoded secret — move to environment variable" },
  { id: "sql-concat", regex: /(["'`])(SELECT|INSERT|UPDATE|DELETE)\b[^"'`]*(\$\{|\.format\(|%\s*\()/i, msg: "SQL string concatenation — use parameterized queries" },
  { id: "shell-inject", regex: /(exec|execSync|spawn|system|popen)\s*\([^)]*(\$\{|`[^`]*\$\{|\+\s*(req|input|arg|param|user))/i, msg: "Possible command injection — validate/sanitize input" },
  { id: "dangerous-innerhtml", regex: /innerHTML\s*=\s*[^;]*(\$\{|`[^`]*\$\{|\+\s*(req|input|data|user))/i, msg: "Possible XSS via innerHTML — use textContent or sanitize" },
  { id: "disabled-tls", regex: /(rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*[=:]\s*["']?0)/, msg: "TLS verification disabled — remove for production" },
];

/** File extensions worth scanning (code files only). */
const CODE_EXTENSIONS = /\.(js|ts|jsx|tsx|mjs|cjs|py|rb|go|java|rs|php|cs|sh|bash)$/i;

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    let size = 0;
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => {
      size += Buffer.byteLength(c);
      if (size > MAX_STDIN_BYTES) { resolve(data); return; }
      data += c;
    });
    process.stdin.on("end", () => resolve(data));
    setTimeout(() => resolve(data), 2000).unref();
  });
}

/** Extract the file path from a PostToolUse event. */
function extractFilePath(event) {
  const input = event.tool_input || {};
  // Write tool: file_path
  if (input.file_path) return input.file_path;
  // Edit/apply_patch: path or file_path
  if (input.path) return input.path;
  // apply_patch may embed path in the patch content — skip complex parsing
  return null;
}

/** Scan content against L1 patterns. Returns array of findings. */
function scan(content) {
  const findings = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of L1_PATTERNS) {
      if (pattern.regex.test(line)) {
        findings.push({ id: pattern.id, line: i + 1, msg: pattern.msg, code: line.trim().slice(0, 120) });
      }
    }
  }
  return findings;
}

async function main() {
  if (process.env.CODEX_KIT_SECURITY_L1 === "0") return;
  try {
    const raw = await readStdin();
    if (!raw.trim()) return;
    const event = JSON.parse(raw);

    // Only fire on code-writing tools
    const toolName = event.tool_name || "";
    if (!/apply_patch|Edit|Write/i.test(toolName)) return;

    // Extract file path
    const filePath = extractFilePath(event);
    if (!filePath || !CODE_EXTENSIONS.test(filePath)) return;

    // Read the file (skip large files)
    let content;
    try {
      const { statSync } = await import("node:fs");
      const stat = statSync(filePath);
      if (stat.size > MAX_FILE_READ) return;
      content = readFileSync(filePath, "utf8");
    } catch {
      return; // file may not exist yet or be unreadable
    }

    // Scan
    const findings = scan(content);
    if (findings.length === 0) return;

    // Emit warning
    const summary = findings
      .map((f) => `  L${f.line} [${f.id}]: ${f.msg}\n    ${f.code}`)
      .join("\n");

    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext:
            `[L1 Security] ${findings.length} high-risk pattern(s) detected in ${filePath}:\n` +
            summary +
            "\nFix these before continuing. If intentional, add a suppression comment.",
        },
      }),
    );
  } catch {
    // never block
  }
}

main().finally(() => process.exit(0));
