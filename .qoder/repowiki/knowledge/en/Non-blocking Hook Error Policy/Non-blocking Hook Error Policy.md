---
kind: error_handling
name: Non-blocking Hook Error Policy
category: error_handling
scope:
    - '**'
source_files:
    - hooks/rtk-pretooluse.mjs
    - hooks/lens-reminder.mjs
    - hooks/README.md
---

This repository contains no application-level error types, sentinel errors, or centralized error-handling library. The only error-handling pattern is a deliberate **non-blocking hook contract** implemented in the two Node.js lifecycle hooks that integrate with OpenAI Codex.

### What system/approach is used
- **Failing open by design**: both `hooks/rtk-pretooluse.mjs` and `hooks/lens-reminder.mjs` swallow every exception and always exit with code 0 and no stdout on any failure path. This guarantees the hook can never block or alter the user's original command — if anything goes wrong (missing dependency, parse error, timeout), the original Bash command runs unmodified.
- **Timeouts as error protection**: stdin reading is guarded by a 2-second `setTimeout(...).unref()` so a hung Codex event stream cannot stall the hook indefinitely.
- **Dependency-error tolerance**: the RTK rewrite loop tries multiple candidate binaries (`RTK_BIN`, PATH entries, `~/.local/bin`, `/opt/homebrew/bin`, `/usr/local/bin`) and silently skips each one that throws or times out; it falls through to "no rewrite" rather than failing the hook.
- **Exit-code interpretation**: the RTK hook accepts rtk exit codes 0 or 3 for a successful rewrite and treats 1 as "no rewrite"; any other status is treated as an error and results in no rewrite being emitted.

### Key files and packages
- `hooks/rtk-pretooluse.mjs` — PreToolUse hook implementing the non-blocking rewrite contract; documents the policy in its JSDoc comment.
- `hooks/lens-reminder.mjs` — PostToolUse reminder hook using the same swallow-and-exit-0 pattern.
- `hooks/README.md` — User-facing documentation of the non-blocking guarantee.

### Architecture and conventions
- Hooks are standalone CLI scripts invoked by Codex via its lifecycle hook mechanism; they have no shared error module because there is nothing to share — the convention is uniform: try → catch → ignore → exit(0).
- Errors are surfaced only indirectly: when a rewrite succeeds the hook writes structured JSON to stdout; when it fails it writes nothing, which Codex interprets as "no change".
- There is no logging, no error reporting back to Codex, and no retry logic beyond trying alternate binary locations.

### Rules developers should follow
- Any new hook added to this kit must honor the same contract: never throw, never write to stderr/stdout on failure, and always `process.exit(0)`.
- Do not add custom error types or propagate errors up the call stack inside hooks — wrap all async work in try/catch and treat every branch as a no-op rewrite.
- If you need to surface diagnostic information, log to a file or use an external telemetry channel instead of stdout/stderr, since those channels are consumed by Codex's hook protocol.