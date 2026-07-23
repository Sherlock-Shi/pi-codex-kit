---
name: verify-work
description: "Multi-phase UAT gate — cold-start smoke, build, typecheck, lint, tests, step-by-step manual verification, gaps-closure loop. Use after develop-tdd or implementation, before audit-code."
---

# Verify Work

> **HARD GATE** — No task is “done” until manual UAT is confirmed with evidence.
>
> **HARD GATE** — Do NOT run on `main` or `master`. Use a feature branch.

Review answers “is the code good?”; Verify answers “does the built thing do what was promised?”

## Modes

- Default: full UAT plus gaps loop
- --smoke: Cold-start only plus one happy-path flow. Use for hotfixes.
- --cli: CLI tool verification — replaces cold-start with binary smoke checklist. Use for CLI tools with no server process.

## Risk-Scaled Depth

Scale verification rigor by task risk (default P1 if unspecified):
- **P0**: Full verify-work multi-phase + security scan (step 5).
- **P1**: Standard verify-work (build, test, lint, step-by-step manual).
- **P2**: Smoke, typecheck, lint only. Skip tests and step-by-step manual UAT.
- **P3**: Typecheck and lint only.

## Process

0. **Branch check** — must not be `main`/`master`.

0a. **Preflight / CI green (HARD GATE)** — Run the project's preflight or build command (from AGENTS.md or project config). If a PR is open, check CI status. Failure blocks all phases.

1. Read the active task spec and acceptance criteria. Note the risk level (P0–P3).

1a. **Pre-UAT verify validation** — for each task's verify command, run it and detect pattern mismatches before UAT begins. If a grep/awk/jq command fails, check whether the pattern is wrong vs. a genuine failure:
    ```bash
    # For a failing grep -q 'PATTERN' FILE, check what is actually in FILE
    grep 'PATTERN' FILE || grep -n '' FILE | head -20   # show nearest lines
    ```
    Report: `"Pattern 'X' not found. Nearest match: 'Y' at line N"` and ask `"Update verify command? [Y/n]"`. Fix before proceeding.

2. **Cold-start smoke** (if app; skip if P3): stop server, clear caches, boot from scratch.

3. **Mechanical gates**: build → typecheck → lint → tests (from project AGENTS.md or build config). Skip tests if P2/P3.

> **HARD GATE — One-test-minimum terminal verdict:** At least one mechanical gate MUST be a **real terminal-verdict command** (shell exits 0 or non-zero — not prose, not combined log excerpts). Record that command's stdout/stderr from a **single contiguous run**.

4. **Security scan** (skip if P2/P3) — run `security-gate` or semgrep against the git diff. If any HIGH findings exist → **block the gate**.

5. **Step-by-step UAT** (skip if P2/P3) — one user-observable action at a time.

6. **Gaps loop** — failures → log → fix → re-verify until all gaps are closed.

## Verify sub-operations

### Cold-Start Smoke

Stop server, clear caches, boot from scratch; confirm no stale config affects behavior.

### Gaps Loop

After UAT, identify and close any gaps between promised behavior and actual behavior:

- Capture what was promised in the task description
- Document what actually happened (expected vs actual)
- If behavior doesn't match the promises, log the gap
- Fix the gap (or loop back to `develop-tdd`)
- Re-verify until all gaps are closed (gaps count = 0)

## UAT dialogue

- Pass: user confirms per step.
- Fail: capture expected vs actual; do not mark the task as done.

## Persist verification evidence

After UAT passes, write structured evidence to a verification file (e.g. `verifications/<task-id>-verify.yaml`):

```yaml
task_id: my-task
verified_at: "2026-07-23T14:30:00Z"
verifier: verify-work
phases:
  smoke:
    passed: true
  build:
    passed: true
    command: "npm run build"
  typecheck:
    passed: true
  lint:
    passed: true
  tests:
    passed: true
    coverage: "94.2%"
  terminal_verdict:
    command: "npm test"
    exit_code: 0
    captured_at: "2026-07-23T14:25:00Z"
    note: "Single run — do not merge output from other attempts"
  manual:
    steps:
      - step: "Open /login"
        expected: "Login form renders"
        actual: "Login form rendered correctly"
        passed: true
  gaps:
    closed: true
```

> **HARD GATE** — Verification evidence MUST be persisted before marking the task done. No evidence = not verified.

## --cli mode

CLI tools: use `--cli` when no server process. Replaces cold-start smoke with binary detection + checklist.

---

# Verify Work — Reference

## Cold-start smoke

> **Caution:** These commands stop processes and clear caches. Confirm with the user before running destructive commands.

```bash
# Example — adapt to project's actual dev server and cache paths
# Stop the dev server (use the project's specific process name)
npx kill-port <port> 2>/dev/null || true
# Clear build caches (only project-specific cache dirs)
rm -rf .next/cache node_modules/.cache 2>/dev/null || true
# Start fresh
<run command> &
sleep 3 && curl -sf http://localhost:<port>/health || echo "BOOT FAIL"
```

## Gaps template

```markdown
## Gaps (verify-work)

| Step | Expected | Actual | Status |
|------|----------|--------|--------|
| 1 | ... | ... | FAIL |
```

Feed gaps back as new fix tasks with verify commands, then re-run verify-work.

## CLI mode

For CLI tools where cold-start smoke does not apply. Auto-detected when no server process; or use `--cli`.

**Auto-detect binary name:**
```bash
BINARY=$(grep '^name' Cargo.toml | head -1 | awk -F'"' '{print $2}')  # Cargo
BINARY=$(node -e "console.log(require('./package.json').bin && Object.keys(require('./package.json').bin)[0] || '')" 2>/dev/null)
BINARY=$(grep '^BIN\s*=' Makefile 2>/dev/null | awk '{print $3}')
```

**Checklist (replaces cold-start smoke):**
1. `$BINARY --help` → output contains "Usage"
2. `$BINARY --version` → matches manifest
3. README example command → non-empty output
4. `$BINARY --invalid-flag` → exit ≠ 0 with error message
