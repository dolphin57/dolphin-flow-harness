/**
 * Dolphin Flow Harness Autopilot State
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { resolve } from 'path';

import type {
  DfhAutopilotArtifacts,
  DfhAutopilotConfig,
  DfhAutopilotPaths,
  DfhAutopilotPhase,
  DfhAutopilotPipelineConfig,
  DfhAutopilotState,
  DfhPipelineStageId,
  DfhPipelineStageState,
  DfhStageTransitionResult
} from './types.js';
import {
  DEFAULT_DFH_AUTOPILOT_CONFIG,
  DFH_AUTOPILOT_SIGNALS
} from './types.js';

const DFH_AUTOPILOT_DIR = '.dfh/autopilot';
const STATE_FILE_NAME = 'state.json';

function nowIso(): string {
  return new Date().toISOString();
}

function getDefaultArtifacts(): DfhAutopilotArtifacts {
  return {
    filesCreated: [],
    filesModified: [],
    filesDeleted: [],
    unresolvedIssues: [],
    risks: [],
  };
}

function buildPipelineStages(
  config: DfhAutopilotPipelineConfig
): DfhPipelineStageState[] {
  return [
    {
      id: 'analyst',
      phase: 'expansion',
      status: 'active',
      signal: DFH_AUTOPILOT_SIGNALS.analyst,
      startedAt: nowIso(),
      iterations: 0,
    },
    {
      id: 'plan',
      phase: 'planning',
      status: 'pending',
      signal: DFH_AUTOPILOT_SIGNALS.plan,
      iterations: 0,
    },
    {
      id: 'execute',
      phase: 'execution',
      status: 'pending',
      signal: DFH_AUTOPILOT_SIGNALS.execute,
      iterations: 0,
    },
    {
      id: 'qa',
      phase: 'qa',
      status: config.runQa ? 'pending' : 'skipped',
      signal: DFH_AUTOPILOT_SIGNALS.qa,
      iterations: 0,
    },
    {
      id: 'verify',
      phase: 'validation',
      status: config.runValidation ? 'pending' : 'skipped',
      signal: DFH_AUTOPILOT_SIGNALS.verify,
      iterations: 0,
    },
  ];
}

export function resolveAutopilotPaths(
  directory: string,
  config?: DfhAutopilotConfig
): DfhAutopilotPaths {
  const baseDir = resolve(directory, DFH_AUTOPILOT_DIR);

  return {
    rootDir: baseDir,
    stateFile: resolve(baseDir, STATE_FILE_NAME),
    specFile: resolve(baseDir, config?.paths?.specFile ?? 'spec.md'),
    planFile: resolve(baseDir, config?.paths?.planFile ?? 'plan.md'),
    openQuestionsFile: resolve(
      baseDir,
      config?.paths?.openQuestionsFile ?? 'open-questions.md'
    ),
    summaryFile: resolve(baseDir, config?.paths?.summaryFile ?? 'summary.md'),
  };
}

export function ensureAutopilotDir(
  directory: string,
  config?: DfhAutopilotConfig
): DfhAutopilotPaths {
  const paths = resolveAutopilotPaths(directory, config);
  mkdirSync(paths.rootDir, { recursive: true });
  return paths;
}

export function readAutopilotState(directory: string): DfhAutopilotState | null {
  const paths = resolveAutopilotPaths(directory);
  if (!existsSync(paths.stateFile)) {
    return null;
  }

  try {
    const raw = readFileSync(paths.stateFile, 'utf-8');
    const parsed = JSON.parse(raw) as DfhAutopilotState;
    const mergedPaths = {
      ...paths,
      ...parsed.paths,
      summaryFile: parsed.paths?.summaryFile ?? paths.summaryFile,
    };

    return {
      ...parsed,
      paths: mergedPaths,
      artifacts: {
        ...getDefaultArtifacts(),
        ...parsed.artifacts,
      },
    };
  } catch {
    return null;
  }
}

export function writeAutopilotState(
  directory: string,
  state: DfhAutopilotState
): boolean {
  const paths = ensureAutopilotDir(directory, {
    paths: {
      specFile: state.paths.specFile,
      planFile: state.paths.planFile,
      openQuestionsFile: state.paths.openQuestionsFile,
      summaryFile: state.paths.summaryFile,
    },
  });

  const nextState: DfhAutopilotState = {
    ...state,
    updatedAt: nowIso(),
    paths,
  };

  writeFileSync(paths.stateFile, JSON.stringify(nextState, null, 2), 'utf-8');
  return true;
}

export function clearAutopilotState(directory: string): boolean {
  const paths = resolveAutopilotPaths(directory);
  if (!existsSync(paths.stateFile)) {
    return true;
  }

  rmSync(paths.stateFile, { force: true });
  return true;
}

export function getCurrentStage(
  state: DfhAutopilotState
): DfhPipelineStageState | null {
  const stage = state.pipeline.stages[state.pipeline.currentStageIndex];
  return stage ?? null;
}

export function initAutopilot(
  directory: string,
  request: string,
  sessionId?: string,
  config?: DfhAutopilotConfig
): DfhAutopilotState {
  const mergedPipelineConfig: DfhAutopilotPipelineConfig = {
    ...DEFAULT_DFH_AUTOPILOT_CONFIG.pipeline,
    ...config?.pipeline,
  };
  const paths = ensureAutopilotDir(directory, config);
  const startedAt = nowIso();

  const state: DfhAutopilotState = {
    active: true,
    phase: 'expansion',
    iteration: 1,
    maxIterations: config?.maxIterations ?? DEFAULT_DFH_AUTOPILOT_CONFIG.maxIterations,
    originalRequest: request,
    startedAt,
    updatedAt: startedAt,
    completedAt: null,
    sessionId,
    projectPath: resolve(directory),
    paths,
    pipeline: {
      config: mergedPipelineConfig,
      currentStageIndex: 0,
      stages: buildPipelineStages(mergedPipelineConfig),
    },
    artifacts: getDefaultArtifacts(),
  };

  writeAutopilotState(directory, state);
  return state;
}

export function incrementAutopilotIteration(directory: string): DfhAutopilotState | null {
  const state = readAutopilotState(directory);
  if (!state) {
    return null;
  }

  state.iteration += 1;
  const currentStage = getCurrentStage(state);
  if (currentStage) {
    currentStage.iterations += 1;
  }

  writeAutopilotState(directory, state);
  return state;
}

export function updateAutopilotArtifacts(
  directory: string,
  updates: Partial<DfhAutopilotArtifacts>
): DfhAutopilotState | null {
  const state = readAutopilotState(directory);
  if (!state) {
    return null;
  }

  state.artifacts = {
    ...state.artifacts,
    ...updates,
    filesCreated: updates.filesCreated ?? state.artifacts.filesCreated,
    filesModified: updates.filesModified ?? state.artifacts.filesModified,
  };

  writeAutopilotState(directory, state);
  return state;
}

export function markAutopilotFailed(
  directory: string,
  reason: string
): DfhAutopilotState | null {
  const state = readAutopilotState(directory);
  if (!state) {
    return null;
  }

  state.active = false;
  state.phase = 'failed';
  state.completedAt = nowIso();
  state.failureReason = reason;

  const currentStage = getCurrentStage(state);
  if (currentStage) {
    currentStage.status = 'failed';
    currentStage.notes = reason;
  }

  writeAutopilotState(directory, state);
  return state;
}

export function completeAutopilot(directory: string): DfhAutopilotState | null {
  const state = readAutopilotState(directory);
  if (!state) {
    return null;
  }

  state.active = false;
  state.phase = 'complete';
  state.completedAt = nowIso();

  writeAutopilotState(directory, state);
  return state;
}

export function advanceAutopilotStage(directory: string): DfhStageTransitionResult {
  const state = readAutopilotState(directory);
  if (!state) {
    return { advanced: false, state: null };
  }

  const currentStage = getCurrentStage(state);
  if (!currentStage) {
    return { advanced: false, state };
  }

  currentStage.status = 'complete';
  currentStage.completedAt = nowIso();

  let nextIndex = state.pipeline.currentStageIndex + 1;
  while (
    nextIndex < state.pipeline.stages.length &&
    state.pipeline.stages[nextIndex].status === 'skipped'
  ) {
    nextIndex += 1;
  }

  if (nextIndex >= state.pipeline.stages.length) {
    const completedState = completeAutopilot(directory);
    return {
      advanced: true,
      state: completedState,
      previousStage: currentStage,
      currentStage: null,
    };
  }

  const nextStage = state.pipeline.stages[nextIndex];
  nextStage.status = 'active';
  nextStage.startedAt = nextStage.startedAt ?? nowIso();
  state.pipeline.currentStageIndex = nextIndex;
  state.phase = nextStage.phase;

  writeAutopilotState(directory, state);

  return {
    advanced: true,
    state,
    previousStage: currentStage,
    currentStage: nextStage,
  };
}

export function isTerminalPhase(phase: DfhAutopilotPhase): boolean {
  return phase === 'complete' || phase === 'failed';
}

export function getStageDisplayName(stageId: DfhPipelineStageId): string {
  switch (stageId) {
    case 'analyst':
      return 'Expansion';
    case 'plan':
      return 'Planning';
    case 'execute':
      return 'Execution';
    case 'qa':
      return 'Quality Assurance';
    case 'verify':
      return 'Validation';
  }
}
