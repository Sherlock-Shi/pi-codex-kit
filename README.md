# pi-codex-kit

Portable, **standalone** Codex tooling migrated from the pi coding agent. Gives OpenAI Codex the same code-tightening, code-quality, and token-saving behavior you had in pi — with **zero linkage to `~/.pi`** or pi's runtime.

Syncs to other machines (e.g. a MacBook Air) as a private git repo. Skills are distributed through **cc-switch** (SSOT `~/.cc-switch/skills/` → symlinked into `~/.codex/skills/`).

---

## What this kit provides

| Capability | Codex mechanism | Source (provenance) |
|---|---|---|
| **RTK** token-saving shell rewrite | `PreToolUse` hook → `rtk rewrite` | rtk v0.43.0 (standalone binary) |
| **pi-lens** code-quality feedback | MCP server (`[mcp_servers.pi-lens]`) | `pi-lens@3.8.71` from npm (standalone install) |
| **pi-simplify** code simplification review | `simplify` skill + bundled script | ported from `pi-simplify@0.2.3` |
| pi-lens authoring skills ×4 | cc-switch skills | adapted from pi-lens |
| Curated review/TDD skills ×11 | cc-switch skills | adapted from bigpowers + piolium |
| AGENTS.md coding glue | cc-switch prompt manager (append) | `agents-md/coding-glue.md` |

**Not included (deliberately):** context-mode, pi-subagents, pi-dynamic-workflows, pi-hermes-memory, pi-permission-system — pi-internal APIs with no clean Codex equivalent.

---

## Directory layout

```
pi-codex-kit/
├── README.md                        ← this file (incl. AGENT CONTRACT below)
├── .gitignore
├── hooks/
│   ├── rtk-pretooluse.mjs           ← PreToolUse: rewrites shell cmds via rtk
│   └── lens-reminder.mjs            ← PostToolUse: nudges pi-lens analysis
├── scripts/
│   ├── mcp-smoke.mjs                ← verifies the pi-lens MCP server starts + lists tools
│   ├── append-mcp.mjs               ← ADDITIVE, idempotent [mcp_servers.pi-lens] insertion
│   └── merge-hooks.mjs              ← ADDITIVE, idempotent hooks.json merge
├── pi-lens/
│   ├── install.ps1                  ← Windows: standalone npm install of pi-lens
│   └── install.sh                   ← macOS/Linux: same
├── codex-config/
│   ├── mcp-servers.template.toml    ← reference block only
│   └── hooks.template.json          ← reference; rendered + merged at install
├── skills/                          ← authored here; copied into ~/.cc-switch/skills/
│   ├── simplify/
│   ├── pi-lens-ast-grep/
│   ├── pi-lens-lsp-navigation/
│   ├── pi-lens-write-ast-grep-rule/
│   ├── pi-lens-write-tree-sitter-rule/
│   └── (curated: audit-code, develop-tdd, ... code-reviewer, fp-check, ...)
├── agents-md/
│   └── coding-glue.md               ← APPEND to AGENTS.md via cc-switch prompt manager
├── install.ps1                      ← Windows orchestrator
└── install.sh                       ← macOS/Linux orchestrator
```

---

## ⚠️ AGENT CONTRACT — read before touching `~/.codex/`

Any agent (or human) applying this kit to a machine **must** obey:

1. **ADD, NEVER REPLACE.** `~/.codex/config.toml` holds the user's providers, plugins, marketplaces, and project-trust settings. **The installer never modifies it.** MCP registration is a manual paste step: the installer prints the exact `[mcp_servers.pi-lens]` block and the user adds it by hand. Never rewrite, reformat, reorder, or regenerate the file.
2. **Scripts are opt-in helpers only.** `scripts/append-mcp.mjs` and `scripts/merge-hooks.mjs` are additive and idempotent, but only `merge-hooks.mjs` (hooks.json) is run by the installer. `append-mcp.mjs` (config.toml) is never invoked automatically — it exists for users who explicitly want scripted insertion.
3. **Backups.** `merge-hooks.mjs` backs up `hooks.json` before editing. If you ever use `append-mcp.mjs` manually, it backs up `config.toml` first.
4. **Be idempotent.** Both scripts check whether the entry already exists and no-op if so. Re-running install must be safe.
5. **Verify after.** For any manual config.toml edit, diff against a backup — the only change should be the block you added. Run `scripts/mcp-smoke.mjs` against the installed server.
6. **Rollback.** Remove the `[mcp_servers.pi-lens]` block you pasted, remove `~/.codex/hooks/*.mjs` + their `hooks.json` entries, and delete `~/.codex/vendor/pi-lens/`.

---

## Prerequisites (per machine)

- **Node.js** on PATH (`node --version`). Install verifies this first.
- **git** on PATH.
- **rtk** binary on PATH or at `~/.local/bin/rtk[.exe]` (override with `RTK_BIN`). Windows: already at `~/.local/bin/rtk.exe`. macOS: install the `rtk-aarch64-apple-darwin` release binary or via brew.
- **cc-switch** (for skill distribution + cloud sync).

---

## Install (Windows)

```powershell
git clone <private-repo-url> D:\Pi_DevelopmentnTooling\pi-codex-kit
cd D:\Pi_DevelopmentnTooling\pi-codex-kit
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

## Install (macOS / Linux)

```bash
git clone <private-repo-url> ~/dev/pi-codex-kit
cd ~/dev/pi-codex-kit
./install.sh
```

The orchestrator runs these phases:

1. **Pre-flight** — node / git / rtk checks.
2. **pi-lens runtime** — `npm install --omit=peer pi-lens@3.8.71 typescript-language-server` into `~/.codex/vendor/pi-lens` (self-contained; native modules built per machine, never synced).
3. **MCP smoke test** — `scripts/mcp-smoke.mjs` confirms the server starts and lists its 16 `pilens_*` tools.
4. **MCP registration (manual)** — the installer PRINTS the exact `[mcp_servers.pi-lens]` block; **you paste it into `~/.codex/config.toml` yourself**. The installer never touches config.toml.
5. **Hooks** — copies `hooks/*.mjs` to `~/.codex/hooks/`, merges `hooks.json` additively (with backup).
6. **Skills → cc-switch SSOT** — copies `skills/*` into `~/.cc-switch/skills/` (skips existing names).
7. **Manual finish** — prints the remaining UI steps (below).

### Manual finish (both platforms)

- **Paste the MCP block** the installer printed into `~/.codex/config.toml` (top level):
  ```toml
  [mcp_servers.pi-lens]
  command = "node"
  args = ["<path the installer printed>"]
  startup_timeout_sec = 30
  ```
- In **cc-switch**: install each new skill **to Codex** (symlink mode) so they land in `~/.codex/skills/`.
- In **cc-switch prompt manager**: **append** `agents-md/coding-glue.md` to your AGENTS.md (do not replace the academic-writing section).
- In **Codex**: run `/hooks` and **trust** the two new hooks (one-time per machine).

---

## Verification checklist

| Check | Pass criterion |
|---|---|
| rtk hook | `echo '{"tool_name":"Bash","tool_input":{"command":"git status"}}' \| node ~/.codex/hooks/rtk-pretooluse.mjs` → prints `updatedInput.command = "rtk git status"` |
| pi-lens MCP | `node scripts/mcp-smoke.mjs <server.js>` → `ok:true`, 16 tools incl. `pilens_session_start`, `pilens_turn_end`; after you paste the block, Codex `/mcp` shows pi-lens connected |
| config integrity | diff `config.toml` vs its `.bak` → only the `[mcp_servers.pi-lens]` block added |
| skills | Codex `/skills` lists `simplify`, `pi-lens-*`, curated; `$simplify` on a dirty tree runs the script + scoped review |
| no pi linkage | no `~/.pi` references in `~/.codex/config.toml` or `hooks.json`; vendor dir self-contained |

---

## Known issues

- **Pre-existing `~/.codex/config.toml` parse error** (not caused by this kit): line ~137 `review_model = "gpt-5.6-sol"` — Codex CLI `0.130.0-alpha.5` expects a struct (`AgentRoleToml`) there, so `codex mcp list/add` fails. This kit therefore uses the **manual additive append** (Option B) and does not depend on the `codex mcp` CLI. Fix that line separately if/when desired.
- **rtk has no native Codex hook yet** in any stable release (PRs #2198/#2234/#2973 open). The custom `rtk-pretooluse.mjs` fills the gap; when a stable `rtk hook codex` ships, swap the one `hooks.json` command.

## Rollback

- MCP: remove the `[mcp_servers.pi-lens]` block you pasted into config.toml.
- Hooks: delete `~/.codex/hooks/rtk-pretooluse.mjs` + `lens-reminder.mjs`, remove their entries from `hooks.json` (or restore backup).
- pi-lens runtime: delete `~/.codex/vendor/pi-lens/`.
- Skills: uninstall in cc-switch (moves them to `skill-backups/`).
- AGENTS.md: revert via cc-switch prompt manager.
