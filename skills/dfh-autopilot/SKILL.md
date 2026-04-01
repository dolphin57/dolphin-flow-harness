---
name: dfh-autopilot
description: Dolphin Flow Harness Autopilot - state/pipeline strict execution mode
---

# Dolphin Flow Harness Autopilot

[DFH AUTOPILOT ACTIVATED]

## Mission

Execute DFH work strictly through the persisted autopilot state and pipeline.
Do not run a free-form workflow. Do not skip stages. Do not invent transitions.

## Source Of Truth

1. `state file`: `.dfh/autopilot/state.json`
2. `pipeline paths` from state:
- `paths.specFile`
- `paths.planFile`
- `paths.openQuestionsFile`
3. `current stage`: `pipeline.stages[pipeline.currentStageIndex]`
4. `required completion signal`: `currentStage.signal`

If these conflict with chat history, state wins.

## Hard Rules

1. Never execute a stage that is not `active`.
2. Never emit a completion signal for work that is not done.
3. Never emit a signal that does not exactly match `currentStage.signal`.
4. Never jump directly to QA/validation before execution is complete.
5. Every stage report must include `Modification Points` before any completion signal.
6. If no file was changed in this stage, `Modification Points` must include `- (none yet): <reason>`.
7. If blocked, report blocker details and continue within current stage boundaries.
8. If state is missing/corrupted, request re-initialization by reporting the issue explicitly.

## Pipeline Contract

Stages and canonical signals:

- `analyst` (phase `expansion`) -> `DFH_STAGE_ANALYST_COMPLETE`
- `plan` (phase `planning`) -> `DFH_STAGE_PLAN_COMPLETE`
- `execute` (phase `execution`) -> `DFH_STAGE_EXECUTE_COMPLETE`
- `qa` (phase `qa`) -> `DFH_STAGE_QA_COMPLETE`
- `verify` (phase `validation`) -> `DFH_STAGE_VERIFY_COMPLETE`

`qa` and `verify` may be `skipped` by pipeline config. If skipped in state, do not run them.

## Stage Execution Checklist

### analyst / expansion

- Expand request into implementation-ready requirements.
- Produce/refresh `specFile`.
- Capture unresolved decisions in `openQuestionsFile`.
- Emit analyst signal only after spec is persisted.

### plan / planning

- Read `specFile`.
- Produce atomic implementation plan in `planFile`.
- Include dependencies, parallel workstreams, and acceptance criteria.
- Emit planning signal only after plan is persisted.

### execute / execution

- Read `planFile`.
- Implement all in-scope tasks.
- Keep progress grounded in plan tasks and acceptance criteria.
- Emit execution signal only when all planned tasks are done.

### qa / qa

- Run project quality gate (typecheck/build/tests/lint when available).
- Fix failures and rerun until pass or explicit blocker.
- Emit QA signal only when checks pass (or stage is configured skipped in state).

### verify / validation

- Validate implementation against spec + plan.
- Confirm functional completeness and residual risks.
- Emit verify signal only when validation pass criteria are met.

## Output Protocol

When working, structure output as:

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

`Modification Points` is mandatory in every stage report.
If there are no file edits yet, use:

```markdown
- Modification Points:
  - (none yet): <reason>
```

When stage is complete, append the exact signal in its own line:

```text
DFH_STAGE_<...>_COMPLETE
```

## Completion Protocol

Only after all non-skipped stages are complete:

1. Ensure state phase reaches `complete`.
2. Provide final summary:
- request
- spec path
- plan path
- files created/modified
- unresolved risks/open items

Do not claim completion early.
