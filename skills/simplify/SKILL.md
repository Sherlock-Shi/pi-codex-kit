---
name: simplify
description: Review and simplify recently changed code for clarity, consistency, and maintainability. Use when the user asks to simplify, tighten, clean up, de-bloat, or review the code they just changed, or before committing. Detects changed files and line ranges via git and scopes edits to those lines only.
---

# Simplify Changed Code

Review recently changed code and apply simplification improvements — scoped strictly to the changed lines.

## When to use

- The user says "simplify", "tighten this up", "clean up my changes", "review the diff", "de-bloat".
- Before committing a batch of changes.
- Do NOT use for whole-codebase refactors or new features.

## Procedure

1. Run the bundled context script from the repository root (it uses git to find changed files and line ranges):

   ```bash
   node "<this skill directory>/scripts/simplify-context.mjs"
   ```

   Variants:
   - Staged changes only: add `--staged`
   - Against a specific ref: add `--ref=main` (or `--ref main`)
   - Specific files: append their paths, e.g. `src/foo.ts src/bar.ts`

2. The script prints a scoped review brief: the changed files with their changed line ranges, plus the Principles/Scope/Process below. If it reports no changed files, stop and tell the user.

3. Apply the review **exactly** per the brief — edit only within the listed line ranges, one file at a time, then run the project's tests.

## Principles

- **Preserve functionality**: Never change what the code does. All existing tests must continue to pass.
- **Apply project standards**: Follow any conventions from CLAUDE.md or AGENTS.md in this project.
- **Enhance clarity**: Reduce unnecessary complexity and nesting, eliminate redundant code and abstractions, improve variable and function names, and consolidate related logic. Keep valuable comments that explain design rationale, business rules, non-obvious behaviour, or intent. Remove only truly redundant noise, such as `// increment i` above `i++`. Avoid nested ternary operators: prefer switch statements or if/else chains for multiple conditions.
- **Maintain balance**: Do not over-simplify. Avoid overly clever solutions that are hard to understand. Do not combine too many concerns into single functions. Do not remove helpful abstractions. Prioritize readability over fewer lines.

## Scope

Only review and modify the changed lines listed by the script. Changed line numbers refer to the current file contents. You may read surrounding code for context, but must not edit it. For added files, the entire file is considered changed.

## Process

1. Read each file listed by the script and inspect its changed lines.
2. Identify concrete improvements within those lines (dead code, unclear names, redundant logic, inconsistent patterns).
3. Apply changes one file at a time, keeping every edit within the listed line ranges.
4. After all changes, run existing tests to verify nothing is broken.
5. Summarize what you changed and why.

Do NOT add new features, change public APIs, or refactor code outside the listed line ranges. If a worthwhile simplification would require editing unchanged code, leave it alone and mention it in the summary instead.
