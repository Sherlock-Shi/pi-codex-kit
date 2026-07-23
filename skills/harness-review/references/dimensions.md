# Harness Review — Dimension Checks

Reference tables for the five harness-review dimensions. Each dimension has three checks; resolve all three before scoring.

## 1. Task Understanding

> Does the agent understand the intended outcome, apply relevant context, and keep work within scope?

| Check | What to look for |
|-------|-----------------|
| **Intent and Acceptance** | Clear task description, definition of done, acceptance criteria, exclusions, non-goals. Is there a recoverable boundary the agent can verify against? |
| **Relevant Context** | Scoped AGENTS.md or rules, architecture docs, canonical schemas, dependent contracts. Does the agent know which source is authoritative? |
| **Scope Boundary** | Explicit target files/modules, risk classification, exclusions. Can the agent tell what is in-scope vs out-of-scope? |

### Typical findings

- "No acceptance criteria exist — the agent cannot know when the task is done."
- "Architecture docs conflict with actual code structure — the agent will follow stale guidance."
- "No scope boundary — the agent may refactor unrelated code."

## 2. Controlled Execution

> Can the agent start and operate the project through supported routes within enforced boundaries?

| Check | What to look for |
|-------|-----------------|
| **Reproducible Startup** | Single-command setup from clean state. Documented runtime versions, lockfile present, no hidden dependencies. Does `npm install && npm run build` (or equivalent) actually work? |
| **Supported Operation** | Discoverable commands for run, test, lint, debug. Documented inputs/outputs. Failure messages are actionable. |
| **Permission Boundary** | Sandbox config, tool allow/deny lists, secret handling, approval gates for destructive actions. Are boundaries enforced mechanically or just documented? |

### Typical findings

- "Setup requires 3 undocumented environment variables — agent will fail on cold start."
- "No test command documented — agent cannot validate changes."
- "Destructive commands (drop table, force push) have no approval gate."

## 3. Change Validation

> Does the agent run verification relevant to the change, diagnose failures, and revalidate after repair?

| Check | What to look for |
|-------|-----------------|
| **Relevant Verification** | Change-to-check mapping: does every material edit have a test/lint/type check that covers it? Is there a single command to run the relevant suite? |
| **Failure Diagnosis and Repair** | Readable error output, stack traces, correlation IDs. Can the agent go from failure to root cause to bounded repair? |
| **Post-repair Revalidation** | After fixing, can the agent re-run the same check to confirm? Is there a fast feedback loop? |

### Typical findings

- "Tests exist but take 12 minutes — agent will skip them or time out."
- "Error messages are generic ('Something went wrong') — agent cannot localize the failure."
- "No way to run a single test file — agent must run the full suite for every fix."

## 4. Reliable Delivery

> Is the result accepted at its real delivery boundary, with risk-appropriate approval and rollback?

| Check | What to look for |
|-------|-----------------|
| **Delivery Acceptance** | PR review requirements, CI gates, merge protection, deployment approval. What is the real acceptance boundary beyond "tests pass locally"? |
| **High-risk Approval** | Protected actions (deploy, migrate, delete, credential rotation) require explicit human or policy approval before execution. |
| **Rollback or Recovery** | Documented rollback path, backups, feature flags, idempotent migrations. Can the agent (or human) undo the change safely? |

### Typical findings

- "No branch protection — agent can push directly to main without review."
- "Database migrations are irreversible — no down migration exists."
- "Deploy is a manual SSH + git pull — no rollback procedure documented."

## 5. Learning Capture

> Does the project detect repeated friction, turn it into reusable improvements, and validate they persist?

| Check | What to look for |
|-------|-----------------|
| **Lifecycle Opportunity Detection** | Are there signals for repeated failures, recurring corrections, or maintenance drift? (git churn, TODO accumulation, stale docs, repeated CI failures) |
| **Loop Engineering** | When a repeated opportunity is found, is there a durable owner (script, hook, skill, CI job) with a trigger, verifier, and stop condition? |
| **Longitudinal Validation** | After an improvement is made, is there a way to confirm it still works later? (scheduled checks, freshness inspections, outcome comparison) |

### Typical findings

- "The same lint error appears in 15 commits — no pre-commit hook prevents it."
- "Setup instructions were last updated 8 months ago and conflict with current dependencies."
- "A CI check was added to prevent a regression but was later disabled without replacement."
