# Hooks

Codex lifecycle hooks that add token-saving shell rewrites and code-quality reminders. These are **additive** — they never modify your existing `hooks.json` entries.

## What's here

| File | Event | What it does |
|------|-------|--------------|
| `rtk-pretooluse.mjs` | `PreToolUse` (Bash) | Rewrites shell commands through [RTK](https://github.com/nickarora/rtk) for 60–90% token savings (e.g. `git status` → `rtk git status`). Non-blocking: if rtk is missing or errors, your original command runs unchanged. |
| `lens-reminder.mjs` | `PostToolUse` (apply_patch/Edit/Write) | Injects a model-visible reminder to run `pilens_analyze` on edited files before declaring done. Disable per-session with `CODEX_KIT_LENS_REMINDER=0`. |

## Prerequisites

- **Node.js** on PATH
- **rtk** binary on PATH or at `~/.local/bin/rtk[.exe]` (only needed for the RTK hook; override location with `RTK_BIN` env var)

## Install

### 1. Copy the hook scripts

```bash
# macOS / Linux
cp rtk-pretooluse.mjs lens-reminder.mjs ~/.codex/hooks/

# Windows (PowerShell)
Copy-Item rtk-pretooluse.mjs, lens-reminder.mjs ~/.codex/hooks/
```

Create `~/.codex/hooks/` first if it doesn't exist.

### 2. Register in `hooks.json`

Add the following entries to `~/.codex/hooks.json`. **Merge** them into any existing `hooks` object — do not replace the file. Replace `<HOOKS_DIR>` with the absolute forward-slash path to your `~/.codex/hooks` directory (e.g. `C:/Users/you/.codex/hooks` or `/home/you/.codex/hooks`):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "^Bash$",
        "hooks": [
          {
            "type": "command",
            "command": "node \"<HOOKS_DIR>/rtk-pretooluse.mjs\"",
            "timeout": 10,
            "statusMessage": "RTK token optimization"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "apply_patch|Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "node \"<HOOKS_DIR>/lens-reminder.mjs\"",
            "timeout": 10,
            "statusMessage": "pi-lens reminder"
          }
        ]
      }
    ]
  }
}
```

### 3. Trust the hooks

Open Codex and run `/hooks` — you'll be prompted to trust the new hooks (one-time per machine).

## Verify

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"git status"}}' | node ~/.codex/hooks/rtk-pretooluse.mjs
```

Expected: JSON output with `updatedInput.command = "rtk git status"`. If rtk isn't installed, no output (silent no-op).

## Disable / Rollback

- **Disable lens-reminder temporarily:** set `CODEX_KIT_LENS_REMINDER=0` in your environment.
- **Remove entirely:** delete the two `.mjs` files from `~/.codex/hooks/` and remove their entries from `hooks.json` (or restore your backup).
