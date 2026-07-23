---
name: security-gate
description: "Local security scanning gate before push, deploy, or release. Runs semgrep against the repository or targeted paths, presents findings with severity and remediation, and gates the handoff on user approval. Use when the user says push, deploy, release, security scan, or invokes /security-gate."
---

# Security Gate

Local security scanning that gates code handoff (push, PR, deploy, release) on a findings-first review. All analysis runs locally via semgrep — no cloud dependency.

## When to Use

- User says "push", "git push", "deploy", "release", "open a PR", "merge"
- User explicitly requests a security scan or invokes `/security-gate`
- Before any committed-code handoff where security assurance is desired

## When NOT to Use

- General code review for style or maintainability (use `code-reviewer`)
- Deep adversarial analysis of a known vulnerability (use `differential-review`)
- Hunting for bug variants after finding one (use `variant-analysis`)
- Verifying whether a specific finding is a true/false positive (use `fp-check`)

## Route Intent

Determine the scan scope from the user's request:

| Intent | Scope |
|--------|-------|
| "scan the whole repo" / "full scan" | Entire repository |
| Named files or directories | Exactly those paths |
| "push" / "deploy" / "release" (implicit) | Changed files since merge-base (`git diff --name-only $(git merge-base HEAD main)..HEAD`) |
| Bare `/security-gate` with no scope | Ask: whole repo or specific paths? |

## Scan Procedure

### 1. Run semgrep

**Preferred:** If the semgrep MCP server is installed (see `../mcp-servers/semgrep-server/README.md`), use the `semgrep_scan` tool for warm-cache scanning:

```
semgrep_scan({ paths: ["<target paths>"], config: "auto" })
```

**Fallback:** If the MCP server is not available, use semgrep directly via Bash:

```bash
# Full repo
semgrep scan --config auto --json --metrics=off .

# Targeted paths
semgrep scan --config auto --json --metrics=off <paths...>
```

If the `variant-analysis` skill is also installed, you can optionally use its bundled rulesets for deeper coverage (e.g. `--config ../variant-analysis/resources/semgrep/python.yaml`). This is optional — `--config auto` is sufficient.

If semgrep is not installed, tell the user:
> "semgrep is required for security-gate. Install: `pip install semgrep` or `brew install semgrep`"

Set a generous timeout (300s+) for large scopes. Do not retry a running scan.

### 2. Parse findings

For each finding, extract:
- **Severity**: ERROR > WARNING > INFO
- **Category/CWE**: from rule metadata
- **File and line**: precise location
- **Code snippet**: the vulnerable pattern
- **Description**: what the rule detected
- **Remediation**: suggested fix from rule metadata

### 3. Findings-first gate

Present ALL findings before any remediation decision. Format:

```
## Security Scan Results

**Scope:** <what was scanned>
**Findings:** N issues (X high, Y medium, Z low)

### [SEVERITY] Title
- **File:** path/to/file.py:42
- **CWE:** CWE-89 (SQL Injection)
- **Code:** `cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")`
- **Issue:** User input interpolated into SQL query without parameterization
- **Fix:** Use parameterized queries: `cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))`
```

If no findings: state "No security issues found in the scanned scope." and proceed.

### 4. Remediation gate

After presenting all findings, ask:

> "Security issues were found. Do you want me to fix them before continuing?"

Offer exactly:
- **Fix now** — apply remediations and verify
- **Continue without fixing** — proceed with the original handoff

Do NOT infer approval from the original push/deploy request. The remediation gate is a separate decision.

### 5. Post-fix halt

If the user chooses "Fix now":
1. Apply only the approved fixes
2. Run relevant tests to verify nothing breaks
3. Report: changed files, which findings were addressed, verification results
4. **STOP.** Do not auto-push, auto-commit, or resume the handoff.
5. Only a NEW user message after the fix summary may authorize continuation.

## Implicit Pre-Push Gate

When the user's request is a handoff (push, deploy, PR, release) rather than an explicit scan request:

1. Identify the changed files since merge-base
2. Offer: "Run a security scan on N changed files before pushing?"
   - **Run scan** — proceed with the scan workflow above
   - **Skip and continue** — proceed with the handoff immediately
3. If skipped, do not ask again for the same commit set

## Integration

- For deeper analysis of HIGH findings, suggest `differential-review`
- For variant hunting after a confirmed finding, suggest `variant-analysis`
- For verifying whether a finding is exploitable, suggest `fp-check`

## Prerequisites

- **semgrep** installed (`pip install semgrep` or `brew install semgrep`)
- **git** (for merge-base detection in implicit mode)
