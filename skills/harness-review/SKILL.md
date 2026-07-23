---
name: harness-review
description: "Assess whether a project can support reliable AI coding-agent work. Reviews five dimensions (Task Understanding, Controlled Execution, Change Validation, Reliable Delivery, Learning Capture) and produces findings with concrete repairs. Use when the user asks to assess project readiness, review the harness, check AI-readiness, or invokes /harness-review."
---

# Harness Review

Review the operating system around coding-agent work: guidance, executable affordances, permissions, feedback, recovery, and reusable learning. Determines whether a project lets an AI agent complete a bounded engineering loop reliably.

This is a read-only assessment. Do not modify the project unless the user explicitly authorizes a repair.

## When to Use

- "Is this project ready for AI-assisted development?"
- "Review the harness" / "assess project readiness"
- "What's blocking the agent from working well here?"
- After repeated friction or failed agent sessions
- Before onboarding a new coding agent to a repository

## When NOT to Use

- Code quality review of specific changes (use `audit-code`)
- Security scanning (use `security-gate` or `differential-review`)
- General architecture refactoring (use `deepen-architecture`)

## Procedure

### Step 1: Map the Harness

Inspect the smallest set of project files that answer these questions:

| Surface | Question |
|---------|----------|
| **Context** | Which guidance, architecture docs, and acceptance criteria tell the agent what matters? |
| **Operation** | Which setup, run, debug, and validation routes are actually executable? |
| **Control** | Which permission, scope, and high-risk boundaries are enforced (not just documented)? |
| **Feedback** | Which checks and diagnostics make failures attributable and actionable? |
| **Recovery** | Which retry, rollback, repair, and escalation paths close the loop? |
| **Learning** | Which repeated opportunities become owned, verifiable improvements? |

Look at: AGENTS.md / CLAUDE.md / README, package manifests, CI config, test setup, linting config, git hooks, pre-commit config, Makefile/scripts, docs/, specs/.

### Step 2: Assess Five Dimensions

For each dimension, evaluate three checks. See [references/dimensions.md](references/dimensions.md) for the full check tables.

Rate each check with an evidence state:
- **Present** — a mechanism exists
- **Wired** — the agent can discover and reach it
- **Exercised** — evidence shows it was actually used successfully
- **Missing** — required mechanism is absent
- **Unobserved** — cannot determine from available evidence

### Step 3: Produce Findings

For each gap found, produce a finding with:
1. **Visible consequence** — what goes wrong for the agent
2. **Cause** — the specific missing or broken mechanism
3. **Intended result** — what "good" looks like
4. **Smallest repair** — the concrete file/command to add or fix
5. **Validation** — how to confirm the repair works

### Step 4: Output

**Inline mode** (default): present findings directly in the conversation.

**Report mode** (user requests "write a report"): produce a markdown file with:
- Project overview and evidence boundary
- Dimension scores (0-100, derived independently — never averaged)
- Findings sorted by repair priority
- Top 3 priority moves

## Evidence Discipline

- File presence proves at most that a mechanism is **Present**, not that it works.
- A configured capability is not observed use.
- A documented command that fails on execution is **Missing**, not Present.
- Do not score a project highly for having many docs unless they connect to actionable feedback.
- History (git log) never proves current runtime health.
- Keep claims bounded: if you cannot inspect it, mark it Unobserved.

## Scoring

Score each dimension independently (0-100). Score ceilings based on evidence:

| Highest evidence | Ceiling |
|-----------------|---------|
| Missing / Unobserved | 59 |
| Present | 74 |
| Wired | 84 |
| Exercised | 100 |

A required check that is missing or blocked keeps its dimension at 59 or lower. Never average the five scores.

## The Core Loop

The fundamental question:

```
Can an AI agent complete this loop in this repository?

understand context -> make a bounded change -> choose the right validation ->
interpret failures -> repair -> re-run validation -> know whether residual risk
needs human review
```

Strong harness engineering makes agent work repeatable, verifiable, recoverable, and auditable. It is not "many docs" or "many CI files."
