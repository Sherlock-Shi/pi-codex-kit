# Coding Standards & Tooling Glue

> Append this section to AGENTS.md via the cc-switch prompt manager. Do NOT replace existing content (e.g. the academic-writing section).

## Coding workflow (pi-codex-kit tooling)

This environment has standalone tooling that keeps generated code tight and future-proof while saving tokens. Use it as follows:

### Token-efficient shell (RTK)
- Shell commands are transparently rewritten through RTK (Rust Token Killer) by a PreToolUse hook — e.g. `git status` runs as `rtk git status` with compact output. No action needed; just be aware command output is deliberately condensed.
- For deliberately large raw output, prefix a command with `RTK_DISABLED=1`.

### Code-quality feedback (pi-lens MCP)
- After modifying source files, run the pi-lens MCP tool `pilens_analyze` on each changed file before declaring a task done, and resolve any blocking diagnostics it reports.
- For broader checks use `pilens_diagnostics` (session/project diagnostic state) and `pilens_project_scan` (cheap project-wide scan).
- At the start of a substantial coding session, consider `pilens_session_start` to baseline diagnostics; `pilens_turn_end` aggregates incremental findings.
- For structural search/refactor use `pilens_ast_grep_search` / `pilens_ast_grep_replace`; for type-level navigation use `pilens_lsp_navigation` and `pilens_lsp_diagnostics`.

### Simplification review (simplify skill)
- Before finishing a coding task or committing, run the `simplify` skill on the current diff. It scopes review to changed lines only.
- Apply its principles: preserve functionality (tests must pass), follow this project's conventions, enhance clarity (reduce complexity/nesting, kill redundancy, better names, no nested ternaries), and maintain balance (readability over fewer lines; don't over-simplify or remove helpful abstractions).

### General code-tightness expectations
- Prefer small, single-responsibility functions with descriptive names.
- Delete dead code and redundant abstractions rather than commenting them out.
- Keep comments that explain *why* (design rationale, business rules, non-obvious behavior); remove noise comments that restate the code.
- Do not change public APIs or refactor outside the scope of the current task unless explicitly asked.
