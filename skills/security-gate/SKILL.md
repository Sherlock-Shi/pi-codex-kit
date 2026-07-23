---
name: security-gate
description: "Progressive security scanning (L2 lightweight + L3 deep). L2: diff-scoped semgrep at task end. L3: cross-file data-flow before push. Aligned with Qoder Security tiers. Use when the user says scan, push, deploy, release, or invokes /security-gate."
---

# Security Gate

Progressive local security scanning aligned with the 3-tier model:

| Tier | When | Depth | This skill's role |
|------|------|-------|-------------------|
| **L1** Static Check | Every code edit | Pattern match | Handled by `hooks/security-l1.mjs` (automatic, not this skill) |
| **L2** Lightweight Scan | End of coding task | Semantic, diff-scoped | This skill in L2 mode |
| **L3** Deep Scan | Before push/deploy | Cross-file data-flow | This skill in L3 mode + `hooks/pre-push` git hook |

All analysis runs locally via semgrep — no cloud dependency.

## When to Use

- Agent assesses task is complete (L2 auto-elicited)
- User says "scan my changes", "check for risks", "lightweight scan"
- User says "push", "git push", "deploy", "release", "open a PR" (triggers L3)
- User explicitly invokes `/security-gate`

## When NOT to Use

- General code review for style or maintainability (use `code-reviewer`)
- Deep adversarial analysis of a known vulnerability (use `differential-review`)
- Hunting for bug variants after finding one (use `variant-analysis`)
- Verifying whether a specific finding is a true/false positive (use `fp-check`)

## Route Intent

| Intent | Tier | Scope | Config |
|--------|------|-------|--------|
| "scan my changes" / task-end nudge | **L2** | `git diff --name-only` since merge-base | `--config auto` |
| "push" / "deploy" / "release" | **L3** | Changed files + cross-file tracing | `--config p/owasp-top-ten` or `auto` |
| "full scan" / "scan the repo" | **Full** | Entire repository | `--config auto` |
| Named files or directories | **L2** | Exactly those paths | `--config auto` |
| Bare `/security-gate` with no scope | Ask | Ask: L2 (quick) or L3 (deep)? | — |

## L2: Lightweight Scan

Diff-scoped semantic scan. Fast (~5-15s). Run at the end of a coding task.

### Procedure

1. **Identify scope**: `git diff --name-only $(git merge-base HEAD main)..HEAD`
2. **Run scan** (preferred via MCP, fallback via Bash):

```
semgrep_scan({ paths: ["<changed files>"], config: "auto" })
```

Or Bash fallback:
```bash
semgrep scan --config auto --json --metrics=off <changed files...>
```

3. **Present findings** (format below)
4. **Remediation offer**: "Fix now" or "Continue"

## L3: Deep Scan

Cross-file data-flow analysis. Slower (~30-120s). Run before push/deploy.

### Procedure

1. **Identify scope**: changed files since merge-base
2. **Run deep scan** with thorough config:

```
semgrep_scan({ paths: ["<changed files>"], config: "p/owasp-top-ten" })
```

Or Bash fallback:
```bash
semgrep scan --config p/owasp-top-ten --json --metrics=off <changed files...>
```

3. **Present findings** with cross-file context
4. **Remediation gate** (mandatory for L3):
   - If HIGH findings exist: **block the push** until fixed or user explicitly overrides
   - Do NOT infer push approval from the original request
5. **Post-fix re-scan**: after fixes, re-run to confirm clean
6. **Git pre-push backstop**: even if this skill workflow is skipped, `hooks/pre-push` blocks push on HIGH findings (bypass: `git push --no-verify`)

## Findings Format

Present ALL findings before any remediation decision:

```
## Security Scan Results (L2/L3)

**Scope:** <what was scanned>
**Tier:** L2 (lightweight) | L3 (deep)
**Findings:** N issues (X high, Y medium, Z low)

### [SEVERITY] Title
- **File:** path/to/file.py:42
- **CWE:** CWE-89 (SQL Injection)
- **Code:** `cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")`
- **Issue:** User input interpolated into SQL query without parameterization
- **Fix:** Use parameterized queries: `cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))`
```

If no findings: "No security issues found in the scanned scope." and proceed.

## Remediation Gate

After presenting findings:

> "Security issues were found. Do you want me to fix them before continuing?"

- **Fix now** — apply remediations, run tests, re-scan to confirm
- **Continue without fixing** — proceed (L2 only; L3 blocks unless user explicitly overrides)

### Post-fix halt

If "Fix now":
1. Apply only the approved fixes
2. Run relevant tests
3. Re-scan to confirm findings are resolved
4. **STOP.** Do not auto-push or auto-commit.
5. Only a NEW user message may authorize continuation.

## Integration

- L1 (automatic): `hooks/security-l1.mjs` fires on every edit — no action needed
- L3 backstop: `hooks/pre-push` git hook blocks push on HIGH findings
- For deeper analysis of HIGH findings: suggest `differential-review`
- For variant hunting after a confirmed finding: suggest `variant-analysis`
- For verifying whether a finding is exploitable: suggest `fp-check`

## Prerequisites

- **semgrep** installed (`pip install semgrep` or `brew install semgrep`)
- **git** (for merge-base detection)
- **semgrep-server MCP** (optional, for warm-cache scanning — see `../mcp-servers/semgrep-server/README.md`)
