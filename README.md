# pi-codex-kit

> **At a glance** · A personal tool-building project. I took features I found useful in the pi coding agent and the Qoder desktop app and CLI, and brought them to OpenAI Codex as add-on hooks, MCP servers and skills. Everything is additive: nothing is installed unless you copy it in.

| Component | What it adds | Count |
|---|---|---|
| Hooks | Shell-command rewriting (RTK), code-quality reminders, a static security check, and a pre-push security scan | 3 Codex hooks + 1 git hook |
| MCP servers | Knowledge-base wiki and warm-cache security scanning (built for this kit), plus setup for the third-party pi-lens code-quality server (16 tools) | 2 built + 1 integrated |
| Skills | Review, TDD, security audit, simplification and more | 20 (8 adapted from open-source projects, [credited](#acknowledgments)) |

**Status (Oct 2026):** several of these features now ship as official extensions, so the kit mainly documents the approach. Each part keeps its own install, verification and rollback steps.

**Version: 1.2.0** — [semver](https://semver.org/): each `feat:` → minor bump; breaking changes → major bump.

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
│   ├── lens-reminder.mjs  ← PostToolUse: nudges pi-lens analysis
│   ├── security-l1.mjs    ← PostToolUse: L1 static security check
│   └── pre-push           ← git hook: L3 semgrep scan before push
├── mcp-servers/
│   ├── README.md          ← server catalog + install
│   ├── SECURITY.md        ← trust-boundary vetting (pi-lens)
│   ├── wiki-server/       ← persistent knowledge-base (SQLite + embeddings)
│   └── semgrep-server/    ← warm-cache security scanning
└── skills/
    ├── README.md          ← skill catalog + install instructions
    ├── simplify/
    ├── audit-code/
    ├── develop-tdd/
    └── ... (20 skills total)
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

#### Security scanning (3-tier progressive model)

Aligned with [Qoder Security](https://docs.qoder.com/qoder-security-guide) tiers:

| Tier | Mechanism | When | Cost |
|------|-----------|------|------|
| **L1** Static Check | `hooks/security-l1.mjs` (PostToolUse) | Automatically after every code edit | Near-zero (regex) |
| **L2** Lightweight Scan | `security-gate` skill (agent-elicited) | End of coding task | Low (semgrep diff-scoped) |
| **L3** Deep Scan | `hooks/pre-push` + `security-gate` skill | Before push/deploy | Medium (semgrep cross-file) |

- L1 fires automatically — catches eval, hardcoded secrets, SQL injection, XSS, disabled TLS.
- L2 is recommended at task end — the agent (or lens-reminder hook) nudges when appropriate.
- L3 blocks `git push` on HIGH findings — bypass with `git push --no-verify`.

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

## Acknowledgments

This kit adapts and builds upon the following works:

| Component | Author / Source | License | What we adapted |
|-----------|----------------|---------|------------------|
| pi-lens MCP server | [Apostolos Mantzaris](https://github.com/apmantza/pi-lens) | MIT | Code-quality MCP integration (16 tools), hook reminder pattern |
| LLM Wiki pattern | [Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) | Public gist | Wiki architecture (raw/wiki/schema layers, ingest/query/lint operations) |
| RTK (Rust Token Killer) | [rtk-ai/rtk](https://github.com/rtk-ai/rtk) | Apache-2.0 | Token-saving shell rewrite concept, PreToolUse hook pattern |
| Deep modules / interface design | John Ousterhout, *A Philosophy of Software Design* | — | Vocabulary and principles in `deepen-architecture` and `develop-tdd` |
| Seam / working effectively | Michael Feathers, *Working Effectively with Legacy Code* | — | Seam concept in `deepen-architecture` |
| Clean Code heuristics (Ch 17) | Robert C. Martin, *Clean Code* | — | Audit checklist heuristics in `audit-code` |
| F.I.R.S.T test rubric | Tim Ottinger & Jeffrey Langr (via Uncle Bob) | — | Test quality enforcement in `enforce-first` |
| Semgrep | [Semgrep / r2c](https://semgrep.dev) | LGPL-2.1 | Security scanning engine wrapped by `semgrep-server` |
| transformers.js | [Xenova / HuggingFace](https://github.com/xenova/transformers.js) | Apache-2.0 | Local embedding model runtime for `wiki-server` |
| all-MiniLM-L6-v2 | [Sentence-Transformers](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) | Apache-2.0 | 384-dim embedding model for wiki vector search |
| differential-review, fp-check, variant-analysis skills | [Trail of Bits](https://github.com/trailofbits/skills) | CC BY-SA 4.0 | Skill text and reference files (partly copied; folders keep CC BY-SA 4.0) |
| code-reviewer skill | [Google Gemini CLI](https://github.com/google-gemini/gemini-cli) | Apache-2.0 | Skill copied unchanged |
| pi-lens-* skills | [Apostolos Mantzaris](https://github.com/apmantza/pi-lens) | MIT | Four authoring and navigation skills, edited to use the MCP tools |
| Codebase-design and TDD skills | [Matt Pocock](https://github.com/mattpocock/skills) | MIT | Module/interface/seam vocabulary and mocking examples in `deepen-architecture` and `develop-tdd` |
| Semver versioning convention | [bigpowers](https://github.com/danielvm-git/bigpowers) by Daniel V. | — | Version policy (feat → minor, breaking → major, MVP → 1.0.0) |
| TDD vertical slices | Kent Beck, *Test-Driven Development: By Example* | — | Red-green-refactor workflow in `develop-tdd` |

The hooks, `wiki-server`, `semgrep-server` and 12 of the 20 skills were written for this kit. Eight skills are copied or closely adapted from the projects above and keep their original licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and the `NOTICE.md` in each of those folders. Ideas taken from the books are paraphrased, not copied.

---

## Not included (deliberately)

context-mode, pi-subagents, pi-dynamic-workflows, pi-hermes-memory, pi-permission-system — pi-internal APIs with no clean Codex equivalent.

---

## License

My own code and documentation are licensed under the [MIT license](LICENSE). Folders adapted from other projects keep their original licenses: CC BY-SA 4.0 (`differential-review`, `fp-check`, `variant-analysis`), Apache-2.0 (`code-reviewer`) and MIT with the original copyright (`pi-lens-*`; parts of `deepen-architecture` and `develop-tdd`). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
