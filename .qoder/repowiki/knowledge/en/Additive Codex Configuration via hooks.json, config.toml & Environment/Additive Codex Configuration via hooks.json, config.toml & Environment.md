---
kind: configuration_system
name: Additive Codex Configuration via hooks.json, config.toml & Environment
category: configuration_system
scope:
    - '**'
source_files:
    - hooks/rtk-pretooluse.mjs
    - hooks/lens-reminder.mjs
    - hooks/README.md
    - mcp-servers/README.md
    - README.md
---

This repository is an additive enhancement kit for OpenAI Codex. It does not ship its own configuration loader; instead it documents and provides the files that a user appends to Codex's existing configuration surface: `~/.codex/hooks.json`, `~/.codex/config.toml`, and environment variables. The kit's code (Node.js hook scripts) reads only process environment at runtime — there is no in-repo config file parser or central config module.

### What system/approach is used
- **Codex lifecycle hooks** (`hooks.json`) — two Node.js `.mjs` scripts are invoked by Codex on `PreToolUse`/`PostToolUse` events. They read JSON from stdin, emit structured `hookSpecificOutput` JSON on stdout, and always exit 0 so they never block the original tool call.
- **MCP server registration** (`config.toml`) — a TOML `[mcp_servers.<name>]` block registers the pi-lens MCP server as a child process of Codex.
- **Environment-driven toggles** — behavior is controlled purely through process env vars (`RTK_BIN`, `CODEX_KIT_LENS_REMINDER`).
- **Skill definitions** — each skill folder ships its own `agents/openai.yaml` plus `SKILL.md`; these are consumed by Codex's slash-command skill loader when copied into `~/.codex/skills/` or `~/.cc-switch/skills/`. No shared skill registry lives in this repo.

### Key files and packages
- `hooks/rtk-pretooluse.mjs` — PreToolUse hook that rewrites Bash commands through the external `rtk rewrite` binary for token savings.
- `hooks/lens-reminder.mjs` — PostToolUse hook that injects a model-visible reminder to run `pilens_analyze` after edits.
- `hooks/README.md` — installation instructions for merging entries into `~/.codex/hooks.json`.
- `mcp-servers/README.md` — install + register the pi-lens MCP server by appending a `[mcp_servers.pi-lens]` TOML block to `~/.codex/config.toml`.
- `skills/<name>/agents/openai.yaml` per skill — per-skill agent configuration consumed by Codex's skill loader.
- `skills/<name>/SKILL.md` — per-skill prompt / instruction document.
- Root `README.md` — top-level quick-start table pointing users to the three integration points above.

### Architecture and conventions
- **Non-blocking contract**: every hook script swallows errors, exits 0, and emits nothing unless it has a concrete rewrite or reminder to inject. This guarantees the underlying Codex tool call always proceeds.
- **Cross-platform rtk discovery**: `candidateBins()` checks `RTK_BIN`, then PATH-resolved `rtk[.exe]`, then `~/.local/bin/rtk`, `/opt/homebrew/bin/rtk`, `/usr/local/bin/rtk`.
- **Idempotent command rewriting**: the RTK hook skips double-wrapping (`rtk` or `rtk ...`) and falls back to the original command if `rtk rewrite` returns no output.
- **Per-session opt-out**: `CODEX_KIT_LENS_REMINDER=0` disables the lens reminder without uninstalling anything.
- **Additive-only**: documentation repeatedly instructs users to *merge* into existing `hooks.json` and *append* to `config.toml` rather than replace them.
- **Vendor isolation**: MCP server dependencies are installed under `~/.codex/vendor/pi-lens/` so they do not pollute project trees.

### Rules developers should follow
- When adding a new hook, follow the non-blocking contract: exit 0 on any error, write nothing on failure, and only emit valid `hookSpecificOutput` JSON on success.
- Discover external binaries via env var first (`RTK_BIN`), then well-known paths; never hardcode absolute locations.
- Keep hook logic minimal — parsing stdin, deciding whether to emit, exiting. Offload heavy work to separate processes (e.g. `rtk rewrite`).
- Provide both macOS/Linux and Windows install snippets in READMEs, using forward-slash paths in TOML examples.
- Do not modify `~/.pi`; all integration points are under `~/.codex/`.