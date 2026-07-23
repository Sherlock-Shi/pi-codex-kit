#!/usr/bin/env node
/**
 * pi-codex-kit — pi-lens PostToolUse reminder hook for OpenAI Codex.
 *
 * The pi-lens MCP server is pull-only (Codex can't auto-run analysis after an
 * edit the way pi's lifecycle did). This hook closes most of that gap: after a
 * file edit it injects a short model-visible reminder to run `pilens_analyze`
 * on the edited file(s) before declaring done.
 *
 * Disable per-session with CODEX_KIT_LENS_REMINDER=0.
 * NON-BLOCKING: any error exits 0 with no stdout.
 */

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    let size = 0;
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => {
      size += Buffer.byteLength(c);
      if (size > 1024 * 1024) { resolve(data); return; }
      data += c;
    });
    process.stdin.on("end", () => resolve(data));
    setTimeout(() => resolve(data), 2000).unref();
  });
}

async function main() {
  if (process.env.CODEX_KIT_LENS_REMINDER === "0") return;
  try {
    const raw = await readStdin();
    if (!raw.trim()) return;
    const event = JSON.parse(raw);

    // Matcher (apply_patch|Edit|Write) already filters; double-check tool name.
    const t = event.tool_name || "";
    if (!/apply_patch|Edit|Write/i.test(t)) return;

    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext:
            "pi-lens: before declaring this task done, run the pi-lens MCP tool " +
            "`pilens_analyze` on the file(s) you just edited and resolve any " +
            "blocking diagnostics it reports.",
        },
      }),
    );
  } catch {
    // never block
  }
}

main().finally(() => process.exit(0));
