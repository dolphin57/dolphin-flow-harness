# DFH Autopilot Definition Of Done (DoD)

## 1. Purpose

This document defines the non-negotiable completion criteria for DFH Autopilot.
It is the contract for phase completion, failure handling, and output quality.

## 2. Global DoD

Autopilot can be considered complete only when all conditions are true:

1. All non-skipped stages are `complete`.
2. Stage artifact gates are satisfied.
3. Completion signals were emitted in correct order.
4. Final summary is generated at `.dfh/autopilot/summary.md`.
5. Risks and unresolved issues are explicitly listed (or `(none)`).

## 3. Stage Output Contract

Every stage output must contain this structure:

```markdown
## DFH Autopilot - <stage id>
- State file: <path>
- Current phase: <phase>
- Required signal: <signal>
- Progress: <what was completed>
- Modification Points:
  - <file or module>: <what changed>
  - <file or module>: <what changed>
- Remaining: <what is still pending>
- Blockers: <none | details>
```

`Modification Points` is mandatory for every stage.
If no file changed yet, output `- (none yet)` with reason.

## 4. Stage Gates

### 4.1 `analyst` (`expansion`)

Done when:
- `spec.md` exists.
- `open-questions.md` exists.
- `DFH_STAGE_ANALYST_COMPLETE` emitted.

Blocked when:
- Signal emitted but any required artifact missing.

### 4.2 `plan` (`planning`)

Done when:
- `plan.md` exists.
- `DFH_STAGE_PLAN_COMPLETE` emitted.

Blocked when:
- Signal emitted but `plan.md` missing.

### 4.3 `execute` (`execution`)

Done when:
- Planned scope implemented.
- `DFH_STAGE_EXECUTE_COMPLETE` emitted.

Blocked when:
- Scope not complete but signal emitted.

### 4.4 `qa` (`qa`)

Done when:
- Required checks pass (or stage skipped by policy).
- `DFH_STAGE_QA_COMPLETE` emitted.

Blocked when:
- Failing checks remain and stage is not skipped.

### 4.5 `verify` (`validation`)

Done when:
- Validation against spec + plan completed.
- `DFH_STAGE_VERIFY_COMPLETE` emitted.

Blocked when:
- Validation reports unresolved critical gap.

## 5. Failure Criteria

Autopilot must move to `failed` when:

1. Iteration count exceeds `maxIterations`.
2. State is corrupted and cannot be repaired.
3. Required stage evidence cannot be produced.

Failure output must include:
- Reason
- Stage
- Last known modification points
- Suggested recovery path

## 6. Recovery Criteria

Recoverable states must support:

1. Resume from last active stage.
2. Cancel without re-trigger loops.
3. Re-run stage after artifact correction.

## 7. Summary Criteria

On completion, summary must include:

1. Artifact paths
2. Modified files (created/modified/deleted)
3. Risks
4. Unresolved issues

If a section has no data, it must still exist with `(none)`.
