# pi-codex-kit

**Version: 1.0.0** — [semver](https://semver.org/): each `feat:` → minor bump; breaking changes → major bump.

Portable, **additive** Codex enhancement kit migrated from the pi coding agent. Gives OpenAI Codex the same code-tightening, code-quality, and token-saving behavior — with **zero linkage to `~/.pi`** and **no forced installation**.

Everything here is self-serve: browse the directory you need, follow its README, copy-paste. Nothing modifies your existing Codex environment unless you explicitly add it.

---

## Quick start

| I want... | Go to | What to do |
|-----------|-------|------------|
| Token-saving shell rewrites (RTK) + code-quality reminders | [`hooks/`](hooks/README.md) | Copy `.mjs` files to `~/.codex/hooks/`, add entries to `hooks.json` |
| pi-lens code-quality MCP server (16 tools) | [`mcp-servers/`](mcp-servers/README.md) | npm install, paste TOML block into `config.toml` |
| Review / TDD / security / simplification skills | [`skills/`](skills/README.md) | Copy skill folders to `~/.cc-switch/skills/` or `~/.codex/skills/` |

Each directory has its own README with step-by-step instructions, verification, and rollback.

---

## Prerequisites

- **Node.js** on PATH (v18+)
- **git** on PATH
- **rtk** binary on PATH or `~/.local/bin/rtk[.exe]` (for the RTK hook only; override with `RTK_BIN`)
- **cc-switch** (optional, for skill distribution + cloud sync)

---

## Directory layout

```
pi-codex-kit/
├── README.md              ← this file
├── .gitignore
├── hooks/
│   ├── README.md          ← install instructions
│   ├── rtk-pretooluse.mjs ← PreToolUse: rewrites shell cmds via rtk
│   └── lens-reminder.mjs  ← PostToolUse: nudges pi-lens analysis
├── mcp-servers/
│   └── README.md          ← pi-lens install + config.toml registration
└── skills/
    ├── README.md          ← skill catalog + install instructions
    ├── simplify/
    ├── audit-code/
    ├── develop-tdd/
    └── ... (19 skills total)
```

---

## Coding Standards & Tooling Glue

> Optional: append the section below to your `AGENTS.md` (e.g. via cc-switch prompt manager) so the agent knows how to use this kit. Do **not** replace existing AGENTS.md content.

### Coding workflow (pi-codex-kit tooling)

This environment has standalone tooling that keeps generated code tight and future-proof while saving tokens. Use it as follows:

#### Token-efficient shell (RTK)
- Shell commands are transparently rewritten through RTK (Rust Token Killer) by a PreToolUse hook — e.g. `git status` runs as `rtk git status` with compact output. No action needed; just be aware command output is deliberately condensed.
- For deliberately large raw output, prefix a command with `RTK_DISABLED=1`.

#### Code-quality feedback (pi-lens MCP)
- pi-lens runs entirely locally — file contents never leave your machine. See `mcp-servers/SECURITY.md` for the full trust boundary.
- After modifying source files, run the pi-lens MCP tool `pilens_analyze` on each changed file before declaring a task done, and resolve any blocking diagnostics it reports.
- For broader checks use `pilens_diagnostics` (session/project diagnostic state) and `pilens_project_scan` (cheap project-wide scan).
- At the start of a substantial coding session, consider `pilens_session_start` to baseline diagnostics; `pilens_turn_end` aggregates incremental findings.
- For structural search/refactor use `pilens_ast_grep_search` / `pilens_ast_grep_replace`; for type-level navigation use `pilens_lsp_navigation` and `pilens_lsp_diagnostics`.

#### Simplification review (simplify skill)
- Before finishing a coding task or committing, run the `simplify` skill on the current diff. It scopes review to changed lines only.
- Apply its principles: preserve functionality (tests must pass), follow this project's conventions, enhance clarity (reduce complexity/nesting, kill redundancy, better names, no nested ternaries), and maintain balance (readability over fewer lines; don't over-simplify or remove helpful abstractions).

#### General code-tightness expectations
- Prefer small, single-responsibility functions with descriptive names.
- Delete dead code and redundant abstractions rather than commenting them out.
- Keep comments that explain *why* (design rationale, business rules, non-obvious behavior); remove noise comments that restate the code.
- Do not change public APIs or refactor outside the scope of the current task unless explicitly asked.

---

## Verification checklist

| Check | Pass criterion |
|-------|----------------|
| RTK hook | `echo '{"tool_name":"Bash","tool_input":{"command":"git status"}}' \| node ~/.codex/hooks/rtk-pretooluse.mjs` → prints `updatedInput.command = "rtk git status"` |
| pi-lens MCP | Codex `/mcp` shows pi-lens connected with 16 tools |
| config integrity | diff `config.toml` vs its backup → only the `[mcp_servers.pi-lens]` block added |
| skills | Codex `/skills` lists your installed skills; `$simplify` on a dirty tree runs scoped review |
| no pi linkage | no `~/.pi` references anywhere in `~/.codex/` |

---

## Known issues

- **Pre-existing `~/.codex/config.toml` parse error** (not caused by this kit): line ~137 `review_model = "gpt-5.6-sol"` — Codex CLI `0.130.0-alpha.5` expects a struct (`AgentRoleToml`) there, so `codex mcp list/add` fails. Use the manual TOML append described in `mcp-servers/README.md` instead of the `codex mcp` CLI.
- **rtk has no native Codex hook yet** in any stable release (PRs #2198/#2234/#2973 open). The custom `rtk-pretooluse.mjs` fills the gap; when a stable `rtk hook codex` ships, swap the one `hooks.json` command.

---

## Not included (deliberately)

context-mode, pi-subagents, pi-dynamic-workflows, pi-hermes-memory, pi-permission-system — pi-internal APIs with no clean Codex equivalent.
