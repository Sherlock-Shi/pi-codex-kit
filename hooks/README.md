# Hooks

Codex lifecycle hooks for token-saving, code-quality, and progressive security scanning. These are **additive** — they never modify your existing `hooks.json` entries.

## What's here

| File | Event | What it does |
|------|-------|--------------|
| `rtk-pretooluse.mjs` | `PreToolUse` (Bash) | Rewrites shell commands through [RTK](https://github.com/rtk-ai/rtk) to save tokens (e.g. `git status` → `rtk git status`). Non-blocking: if rtk is missing or errors, your original command runs unchanged. |
| `lens-reminder.mjs` | `PostToolUse` (apply_patch/Edit/Write) | Injects a reminder to run `pilens_analyze` on edited files. After 5+ edits, also nudges L2 security scan. Disable with `CODEX_KIT_LENS_REMINDER=0`. |
| `security-l1.mjs` | `PostToolUse` (apply_patch/Edit/Write) | **L1 Static Check** — pattern-matches edited code for high-risk patterns (eval, hardcoded secrets, SQL injection, XSS). Near-zero cost, fires automatically. Disable with `CODEX_KIT_SECURITY_L1=0`. |
| `pre-push` | Git `pre-push` | **L3 Deep Scan** — runs semgrep on changed files before push. Blocks on HIGH findings. Bypass: `git push --no-verify`. |

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
          },
          {
            "type": "command",
            "command": "node \"<HOOKS_DIR>/security-l1.mjs\"",
            "timeout": 5,
            "statusMessage": "L1 security check"
          }
        ]
      }
    ]
  }
}
```

### 3. Install the pre-push git hook (L3)

```bash
# From your project root:
cp <kit>/hooks/pre-push .git/hooks/pre-push
chmod +x .git/hooks/pre-push   # macOS/Linux only
```

This blocks `git push` if semgrep finds HIGH-severity issues in changed files. Bypass with `git push --no-verify`.

### 4. Trust the hooks

Open Codex and run `/hooks` — you'll be prompted to trust the new hooks (one-time per machine).

## Verify

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"git status"}}' | node ~/.codex/hooks/rtk-pretooluse.mjs
```

Expected: JSON output with `updatedInput.command = "rtk git status"`. If rtk isn't installed, no output (silent no-op).

## Disable / Rollback

- **Disable L1 security check:** set `CODEX_KIT_SECURITY_L1=0` in your environment.
- **Disable lens-reminder temporarily:** set `CODEX_KIT_LENS_REMINDER=0` in your environment.
- **Remove pre-push gate:** delete `.git/hooks/pre-push` from your project.
- **Remove entirely:** delete the hook files from `~/.codex/hooks/` and remove their entries from `hooks.json`.
