# Skills

Codex skills (slash-command workflows) for code review, TDD, security analysis, and pi-lens authoring. Each skill is a self-contained directory — just copy the folder to install.

## Available skills

| Skill | Description |
|-------|-------------|
| `security-gate` | Local security scanning gate before push/deploy/release using semgrep. |
| `simplify` | Review and simplify recently changed code for clarity and maintainability, scoped to the git diff. |
| `audit-code` | Self-review checklist (conventions, Boy Scout Rule, tests, types, SOLID) before dispatching a reviewer. |
| `code-reviewer` | Review local changes or remote PRs for correctness, maintainability, and style. |
| `deepen-architecture` | Find architecture deepening opportunities — consolidate coupling, improve testability and navigability. |
| `develop-tdd` | Test-driven development with red-green-refactor loop using vertical slices. |
| `differential-review` | Security-focused differential review of code changes with risk scoring. |
| `enforce-first` | Apply the F.I.R.S.T test quality rubric to a test suite or individual tests. |
| `fp-check` | Verify suspected security bugs to eliminate false positives with documented evidence. |
| `harness-review` | Assess project readiness for AI coding-agent work across five dimensions. |
| `knowledge-engine` | Generate and maintain a structured knowledge base (Repo Wiki + Knowledge Cards) for a codebase with drift detection and incremental updates. |
| `llm-wiki` | Build and maintain a persistent, structured knowledge base from raw sources (general-purpose research wiki). |
| `pi-lens-ast-grep` | Search/replace code patterns using ast-grep for semantic accuracy via pi-lens MCP. |
| `pi-lens-lsp-navigation` | Navigate code with IDE features and run proactive LSP diagnostics via pi-lens MCP. |
| `pi-lens-write-ast-grep-rule` | Write new pi-lens ast-grep rule YAML files (schema, drop path, NAPI constraints). |
| `pi-lens-write-tree-sitter-rule` | Write new pi-lens tree-sitter query rule YAML files (S-expressions, captures, predicates). |
| `request-review` | Dispatch a fresh reviewer agent with clean context for an independent second opinion. |
| `respond-review` | Act on reviewer feedback systematically — categorize, fix, verify tests pass. |
| `variant-analysis` | Find similar vulnerabilities across codebases using CodeQL/Semgrep pattern analysis. |
| `verify-work` | Multi-phase UAT gate — smoke, build, typecheck, lint, tests, manual verification. |

## Install

Each skill directory is self-contained (SKILL.md + optional supporting files). Choose one of two paths:

### Option A: via cc-switch (recommended for multi-machine sync)

```bash
# Copy desired skills into the cc-switch SSOT
cp -R simplify ~/.cc-switch/skills/
cp -R develop-tdd ~/.cc-switch/skills/
# ... repeat for each skill you want
```

Then in **cc-switch**, install each new skill **to Codex** (symlink mode) so they appear in `~/.codex/skills/`.

### Option B: direct copy

```bash
# Copy directly into Codex's skills directory
cp -R simplify ~/.codex/skills/
cp -R develop-tdd ~/.codex/skills/
# ... repeat for each skill you want
```

Windows (PowerShell):
```powershell
Copy-Item -Recurse simplify ~/.codex/skills/
Copy-Item -Recurse develop-tdd ~/.codex/skills/
```

## Verify

Open Codex and run `/skills` — your installed skills should appear in the list. Invoke any skill with `$skill-name` (e.g. `$simplify`).

## Notes

- The `pi-lens-*` skills require the pi-lens MCP server (local-only, no network at runtime). See `../mcp-servers/README.md` and `../mcp-servers/SECURITY.md`.
- The `knowledge-engine` skill requires the wiki-server MCP (v2). See `../mcp-servers/wiki-server/README.md`.
- Eight skills (`differential-review`, `fp-check`, `variant-analysis`, `code-reviewer` and the four `pi-lens-*` skills) are adapted from other open-source projects and keep their own licenses; see each folder's `NOTICE.md` and [`../THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).
- Skills are purely additive — copying a new folder never affects existing skills.

## Rollback

Delete the skill folder from `~/.codex/skills/` (or uninstall via cc-switch).
