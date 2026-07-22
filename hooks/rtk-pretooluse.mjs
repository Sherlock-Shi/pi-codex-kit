#!/usr/bin/env node
/**
 * pi-codex-kit — RTK PreToolUse hook for OpenAI Codex.
 *
 * Replicates rtk's Claude Code integration: intercepts Bash tool calls and
 * rewrites the command to its token-optimized rtk equivalent (e.g.
 * `git status` -> `rtk git status`) using `rtk rewrite` as the single source
 * of truth. 60-90% token savings on shell output.
 *
 * NON-BLOCKING CONTRACT (mirrors rtk's own hook policy):
 *   - Every error path exits 0 with NO stdout, so the original command runs
 *     unmodified. A hook must never prevent the user's command from executing.
 *   - Only emits JSON when a rewrite actually applies.
 *
 * Cross-platform: resolves rtk from RTK_BIN, PATH, then common install dirs.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const REWRITE_TIMEOUT_MS = 5000;

function candidateBins() {
  const bins = [];
  if (process.env.RTK_BIN) bins.push(process.env.RTK_BIN);
  if (process.platform === "win32") {
    bins.push("rtk.exe");
    bins.push(path.join(os.homedir(), ".local", "bin", "rtk.exe"));
  } else {
    bins.push("rtk");
    bins.push(path.join(os.homedir(), ".local", "bin", "rtk"));
    bins.push("/opt/homebrew/bin/rtk");
    bins.push("/usr/local/bin/rtk");
  }
  return bins;
}

/** Returns the rewritten command, or "" when no rewrite applies / any error. */
function rewrite(command) {
  for (const bin of candidateBins()) {
    // For absolute/relative paths, skip ones that clearly don't exist.
    if ((bin.includes("/") || bin.includes("\\")) && !existsSync(bin)) continue;
    try {
      const r = spawnSync(bin, ["rewrite", command], {
        encoding: "utf8",
        timeout: REWRITE_TIMEOUT_MS,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
      if (r.error) continue; // not found / timeout -> try next candidate
      const out = (r.stdout || "").trim();
      // rtk exit-code contract (observed in v0.43.0; docs say 0=rewrite,
      // 1=no-rewrite, but the binary actually exits 3 on a successful
      // rewrite). Accept 0 or 3 when stdout carries a rewritten command;
      // treat 1 as "no rewrite"; anything else -> no rewrite, never block.
      if ((r.status === 0 || r.status === 3) && out) return out;
      return "";
    } catch {
      return "";
    }
  }
  return "";
}

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => resolve(data));
    // If stdin never closes, don't hang the hook forever.
    setTimeout(() => resolve(data), 2000).unref();
  });
}

async function main() {
  try {
    const raw = await readStdin();
    if (!raw.trim()) return; // no input -> no-op

    const event = JSON.parse(raw);
    if (event.tool_name !== "Bash") return; // matcher already filters, but be safe

    const command = event.tool_input && event.tool_input.command;
    if (typeof command !== "string" || !command.trim()) return;

    const trimmed = command.trim();
    // Never double-wrap an already-rtk command.
    if (trimmed === "rtk" || trimmed.startsWith("rtk ")) return;

    const rewritten = rewrite(command);
    if (!rewritten || rewritten === command) return;

    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "allow",
          permissionDecisionReason: "RTK auto-rewrite (token optimization)",
          updatedInput: { command: rewritten },
        },
      }),
    );
  } catch {
    // Never block: swallow all errors, exit 0, no stdout.
  }
}

main().finally(() => process.exit(0));
