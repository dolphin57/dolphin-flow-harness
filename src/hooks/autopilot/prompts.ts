/**
 * Dolphin Flow Harness Autopilot Prompt Builders
 */

import type {
  DfhAutopilotState,
  DfhPromptContext,
} from './types.js';
import { getCurrentStage, getStageDisplayName } from './state.js';

function fence(content: string): string {
  return ['```markdown', content.trim(), '```'].join('\n');
}

export function getCurrentStageSignal(state: DfhAutopilotState): string {
  return getCurrentStage(state)?.signal ?? 'DFH_AUTOPILOT_COMPLETE';
}

function getStageOutputContract(context: DfhPromptContext): string {
  const currentStage = getCurrentStage(context.state);
  const stageId = currentStage?.id ?? context.state.phase;

  return fence(`
## DFH Autopilot - ${stageId}
- State file: ${context.paths.stateFile}
- Current phase: ${context.state.phase}
- Required signal: ${getCurrentStageSignal(context.state)}
- Progress: <what was completed>
- Modification Points:
  - <file or module>: <what changed>
  - <file or module>: <what changed>
- Remaining: <what is still pending>
- Blockers: <none | details>
`);
}

function getStageOutputRules(): string {
  return `Stage output rules:
1. "Modification Points" is mandatory in every stage output.
2. If no file changed yet, write \`- (none yet): <reason>\` under "Modification Points".
3. Do not emit completion signal until this stage report is present and stage work is done.`;
}

export function getExpansionPrompt(context: DfhPromptContext): string {
  return `## DFH AUTOPILOT STAGE 0: REQUIREMENT EXPANSION

Target request:
"${context.request}"

Goal:
- Expand the raw request into an implementation-ready requirement package.
- Identify missing assumptions, guardrails, edge cases, and acceptance criteria.
- Save the consolidated result to \`${context.paths.specFile}\`.
- Save unresolved questions to \`${context.paths.openQuestionsFile}\`.

Suggested workflow:
1. Use the DFH analyst lane first.
2. Produce:
   - problem statement
   - explicit requirements
   - implicit requirements
   - out-of-scope
   - acceptance criteria
   - risks / open questions
3. Persist the spec before moving on.

Mandatory stage output format:
${getStageOutputContract(context)}

${getStageOutputRules()}

Required completion signal:
\`${getCurrentStageSignal(context.state)}\`
`;
}

export function getPlanningPrompt(context: DfhPromptContext): string {
  return `## DFH AUTOPILOT STAGE 1: IMPLEMENTATION PLANNING

Read the requirement spec from \`${context.paths.specFile}\`.

Goal:
- Convert the spec into an executable implementation plan.
- Save the plan to \`${context.paths.planFile}\`.

Plan requirements:
1. Break the work into atomic tasks.
2. Mark dependencies between tasks.
3. Identify which tasks can run in parallel.
4. Add measurable acceptance criteria for each task.
5. Record likely failure points and mitigations.

Recommended output structure:
${fence(`
# Implementation Plan

## Task List
1. Task name
   - files:
   - dependencies:
   - acceptance criteria:

## Parallel Workstreams

## Risks
`)}

Mandatory stage output format:
${getStageOutputContract(context)}

${getStageOutputRules()}

Required completion signal:
\`${getCurrentStageSignal(context.state)}\`
`;
}

export function getExecutionPrompt(context: DfhPromptContext): string {
  const executionMode = context.state.pipeline.config.executionMode;

  return `## DFH AUTOPILOT STAGE 2: EXECUTION

Read the implementation plan from \`${context.paths.planFile}\`.

Execution mode: \`${executionMode}\`

Goal:
- Implement the whole request end-to-end.
- Prefer parallel execution for independent tasks.
- Keep the todo list aligned with the plan.
- Track files created and modified in your summary.

Execution rules:
1. Start from the highest-leverage unfinished task.
2. Parallelize only independent work.
3. Verify each task before marking it done.
4. Update docs or config if the implementation needs it.

Mandatory stage output format:
${getStageOutputContract(context)}

${getStageOutputRules()}

Required completion signal:
\`${getCurrentStageSignal(context.state)}\`
`;
}

export function getQaPrompt(context: DfhPromptContext): string {
  return `## DFH AUTOPILOT STAGE 3: QA

Run the local quality gate for this repository.

Minimum checks:
1. Build / typecheck
2. Unit tests
3. Lint, if available

If something fails:
- diagnose
- fix
- rerun the failing command
- repeat until green or until you can explain the blocker precisely

Mandatory stage output format:
${getStageOutputContract(context)}

${getStageOutputRules()}

Required completion signal:
\`${getCurrentStageSignal(context.state)}\`
`;
}

export function getValidationPrompt(context: DfhPromptContext): string {
  return `## DFH AUTOPILOT STAGE 4: VALIDATION

Validate implementation against:
- spec: \`${context.paths.specFile}\`
- plan: \`${context.paths.planFile}\`

Review checklist:
1. Functional completeness
2. Regression risk
3. Code quality
4. Remaining gaps or deferred items

Output a concise validation summary, then emit the completion signal.

Mandatory stage output format:
${getStageOutputContract(context)}

${getStageOutputRules()}

Required completion signal:
\`${getCurrentStageSignal(context.state)}\`
`;
}

export function getStagePrompt(state: DfhAutopilotState): string {
  const context: DfhPromptContext = {
    request: state.originalRequest,
    paths: state.paths,
    state,
  };

  switch (state.phase) {
    case 'expansion':
      return getExpansionPrompt(context);
    case 'planning':
      return getPlanningPrompt(context);
    case 'execution':
      return getExecutionPrompt(context);
    case 'qa':
      return getQaPrompt(context);
    case 'validation':
      return getValidationPrompt(context);
    case 'complete':
      return 'DFH autopilot is already complete.';
    case 'failed':
      return `DFH autopilot failed: ${state.failureReason ?? 'unknown error'}`;
  }
}

export function formatPipelineHud(state: DfhAutopilotState): string {
  const parts = state.pipeline.stages.map(stage => {
    const icon =
      stage.status === 'complete'
        ? '[OK]'
        : stage.status === 'active'
          ? '[>>]'
          : stage.status === 'skipped'
            ? '[--]'
            : stage.status === 'failed'
              ? '[!!]'
              : '[..]';

    return `${icon} ${getStageDisplayName(stage.id)}`;
  });

  return `DFH Pipeline ${state.pipeline.currentStageIndex + 1}/${state.pipeline.stages.length}: ${parts.join(' | ')}`;
}

export function buildStartPrompt(state: DfhAutopilotState): string {
  return `<dfh-autopilot-start>
${formatPipelineHud(state)}

[DFH AUTOPILOT STARTED]

The autopilot state has been initialized at \`${state.paths.stateFile}\`.
Work through the pipeline in order and emit the required stage signal when each stage is complete.

${getStagePrompt(state)}
</dfh-autopilot-start>`;
}

export function buildContinuationPrompt(state: DfhAutopilotState): string {
  const currentStage = getCurrentStage(state);
  const stageLabel = currentStage ? getStageDisplayName(currentStage.id) : state.phase;

  return `<dfh-autopilot-continuation>
${formatPipelineHud(state)}

[DFH AUTOPILOT CONTINUE]
Current stage: ${stageLabel}
Iteration: ${state.iteration}/${state.maxIterations}

${getStagePrompt(state)}
</dfh-autopilot-continuation>`;
}

export function buildCompletionPrompt(state: DfhAutopilotState): string {
  return `<dfh-autopilot-complete>
[DFH AUTOPILOT COMPLETE]

Request:
${state.originalRequest}

Artifacts:
- Spec: \`${state.paths.specFile}\`
- Plan: \`${state.paths.planFile}\`
- Open Questions: \`${state.paths.openQuestionsFile}\`
- Summary: \`${state.paths.summaryFile}\`

Files created: ${state.artifacts.filesCreated.length}
Files modified: ${state.artifacts.filesModified.length}
Files deleted: ${state.artifacts.filesDeleted?.length ?? 0}
</dfh-autopilot-complete>`;
}
