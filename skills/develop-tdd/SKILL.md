---
name: develop-tdd
description: "Test-driven development with red-green-refactor loop using vertical slices. Use for new features or bug fixes."
---

# Develop TDD

> **HARD GATE** — Do NOT proceed if on `main` or `master`. Create a feature branch first.
>
> **HARD GATE** — Do NOT write code before you have a plan. Understand the task, identify behaviors to test, and get user approval on the approach.
>
> **RECURSIVE DISCIPLINE** — This lifecycle applies to EVERY task, including updating these skills. Never skip planning because a task is "meta" or "just documentation."

## Philosophy

Tests verify behavior through public interfaces, not implementation details. A good test reads like a specification. See the Reference section below for the horizontal-slice anti-pattern and TDD phase detail.

## Red Flags

If you catch yourself thinking these, stop and reconsider — you are likely deviating from production-grade craft.

| Red Flag | Reality |
| :--- | :--- |
| "This is too simple to need tests." | Simple code is where bugs hide. If it's simple, the test is cheap. |
| "I'll refactor this later." | "Later" is when technical debt becomes bankruptcy. Refactor while Green. |
| "The tests are already comprehensive." | If you're adding behavior, you need a new test. Coverage ≠ Correctness. |
| "I'm just fixing a small bug." | Small bugs often indicate deep interface flaws. Investigate root cause. |
| "I need to mock this internal class." | Mocking internals couples tests to implementation. Mock only I/O. |
| "This refactor is out of scope." | Leave the code cleaner than you found it (Boy Scout Rule). |
| "Preflight failed but it's unrelated." | **Always Green:** any reproducible gate failure must be fixed before forward work. |
| "I'll note the red gate and continue." | Narrating a failure is not fixing it. Fix or explicitly log. |

## Workflow

### 1. Planning

- [ ] Read the active task spec and acceptance criteria — understand verify steps
- [ ] If a test plan exists for the current work, read it before writing the first test. Implement P0 scenarios before P1.
- [ ] Confirm interface changes and behaviors to test (prioritize)
- [ ] Design interfaces for testability — identify deep module opportunities
- [ ] Get user approval on the plan

Apply the **enforce-first** F.I.R.S.T rubric: Fast, Independent, Repeatable, Self-Validating, Timely.

### 2. Tracer Bullet

Write ONE test that confirms ONE thing about the system:

```
RED:    Write test for first behavior → test fails → commit: test(<scope>): ...  (test-only; red in CI)
GREEN:  Write minimal code to pass → test passes → commit: feat(<scope>): ...   (fix commit; green)
REFACTOR (optional): clean up → commit: refactor(<scope>): ...
```

> **Two-commit red/green policy (HARD GATE)** — Each behavior cycle requires **two separate commits**: (1) test-only commit that fails in CI (RED), then (2) implementation commit that makes it pass (GREEN). Never combine test + fix in one commit. Show `git log -2 --oneline` as evidence before proceeding to the next behavior.

> **Task ledger** — After each task's verify command exits 0, mark that task as passing. Task-set-level passing only when all tasks pass.

### 3. Incremental Loop

> **Snapshot-before-transition:** Before each RED → GREEN or GREEN → REFACTOR transition, create a checkpoint so a failed transition can be rolled back cleanly:

```bash
git stash push -m "tdd-checkpoint-$(git rev-parse --short HEAD)-red" --keep-index 2>/dev/null || true
```

After GREEN passes and is committed, drop the stash (`git stash drop` if empty). Never refactor while RED.

For each remaining behavior: RED → GREEN → REFACTOR (optional). One test at a time. **Two commits per behavior** (test-only RED, then fix GREEN). Commit after every GREEN phase.

### 4. Visual Slices (UI alternate workflow)

For UI components where behavioral unit testing is brittle: extract logic into a Controller/ViewModel/Hook (pure TDD), then use Visual Slices for the View layer. See the Visual Slices section in the Reference below.

### 5. Refactor

After all tests pass: extract duplication, deepen modules, apply SOLID principles. **Never refactor while RED.**

### 6. Verify

After every behavior cycle, run the verify command from the active task. Show evidence before declaring the step done.

### 7. Manual Verification Handover

Once all tests pass: present the verification steps to the user step-by-step, and wait for confirmation of behavioral correctness.


### 6a. CI dry-run sub-step

If this cycle modified CI/workflow files, run a dry-run or lint of the CI config to verify it parses correctly.

## Checklist Per Cycle

```
[ ] Test describes behavior, not implementation
[ ] No test is ignored without an explicit ambiguity note (T4)
[ ] Boundary conditions tested: empty, max, min, off-by-one (T5)
[ ] Tests verify behavior through public interface only — no private methods (T8)
[ ] Test would survive internal refactor
[ ] Code is minimal for this test
[ ] No speculative features added
[ ] Every new abstraction has an explicit "Reason for Depth" justification
[ ] Progress committed (Conventional Commits)
[ ] verify: command passes
```



## Handoff

When all behaviors are implemented and verified, suggest running `verify-work` next.

---

## Reference material

See [references/design-for-testability.md](references/design-for-testability.md) for:
- Anti-pattern: horizontal slices (and the correct vertical approach)
- TDD phase detail (Red/Green/Refactor commit conventions)
- Visual Slices (UI alternate workflow)
- Deep modules and interface design for testability
- When to mock (system boundaries only)
- Refactor candidates
- Good and bad test examples
- Clean Test Heuristics (Uncle Bob, Ch 17)
