---
name: enforce-first
description: "Apply the F.I.R.S.T test quality rubric to a test suite or individual tests. Use when develop-tdd is writing tests, when test quality needs to be checked, or when user mentions F.I.R.S.T or \"test quality\"."
---

# Enforce FIRST

> **HARD GATE** — Before shipping, ALL enforcement checks must pass: lint, typecheck, tests, coverage gates. Do NOT disable or skip checks to get to green.

Apply the F.I.R.S.T rubric to evaluate and improve tests.

This skill is typically invoked internally by `develop-tdd` during the test-writing phase. It can also be run standalone on an existing test suite.

## Modes

- Default: full F.I.R.S.T audit (all 5 criteria)
- --quick: Check Fast, Independent, and Self-Validating criteria only. Skips Repeatable and Timely which require contextual judgment.

## The F.I.R.S.T Rubric

| Criterion | Meaning | Check |
|-----------|---------|-------|
| **Fast** | Tests run quickly | Suite completes in seconds, not minutes. Slow tests don't get run. |
| **Independent** | Tests don't depend on each other | Any test can run in any order. No shared mutable state between tests. |
| **Repeatable** | Tests produce the same result every time | No dependence on time, network, random seeds, or environment. |
| **Self-Validating** | Tests have a clear pass/fail | No manual inspection of output. Boolean result, not "check the logs". |
| **Timely** | Tests are written before or alongside code | Not written long after the code they test. |

## Applying the rubric

For each failing criterion:
1. Identify which tests violate it
2. Describe the fix
3. Apply the fix
4. Re-run the suite to confirm it still passes

Report: "F.I.R.S.T audit complete. X criteria passed, Y fixed."
