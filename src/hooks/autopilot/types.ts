/**
 * Dolphin Flow Harness Autopilot Types
 *
 * A lightweight, OMC-inspired pipeline that can be embedded into the
 * harness without copying the entire upstream runtime.
 */

export type DfhAutopilotPhase =
  | 'expansion'
  | 'planning'
  | 'execution'
  | 'qa'
  | 'validation'
  | 'complete'
  | 'failed';

export type DfhPipelineStageId =
  | 'analyst'
  | 'plan'
  | 'execute'
  | 'qa'
  | 'verify';

export type DfhStageStatus =
  | 'pending'
  | 'active'
  | 'complete'
  | 'failed'
  | 'skipped';

export type DfhExecutionMode = 'solo' | 'parallel';

export interface DfhAutopilotPaths {
  rootDir: string;
  stateFile: string;
  specFile: string;
  planFile: string;
  openQuestionsFile: string;
  summaryFile: string;
}

export interface DfhAutopilotPipelineConfig {
  executionMode: DfhExecutionMode;
  runQa: boolean;
  runValidation: boolean;
}

export interface DfhAutopilotConfig {
  maxIterations?: number;
  paths?: Partial<
    Pick<DfhAutopilotPaths, 'specFile' | 'planFile' | 'openQuestionsFile' | 'summaryFile'>
  >;
  pipeline?: Partial<DfhAutopilotPipelineConfig>;
}

export interface DfhPipelineStageState {
  id: DfhPipelineStageId;
  phase: DfhAutopilotPhase;
  status: DfhStageStatus;
  signal: string;
  startedAt?: string;
  completedAt?: string;
  iterations: number;
  notes?: string;
}

export interface DfhAutopilotArtifacts {
  specSummary?: string;
  planSummary?: string;
  filesCreated: string[];
  filesModified: string[];
  filesDeleted?: string[];
  unresolvedIssues?: string[];
  risks?: string[];
}

export interface DfhAutopilotState {
  active: boolean;
  phase: DfhAutopilotPhase;
  iteration: number;
  maxIterations: number;
  originalRequest: string;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  sessionId?: string;
  projectPath: string;
  paths: DfhAutopilotPaths;
  pipeline: {
    config: DfhAutopilotPipelineConfig;
    currentStageIndex: number;
    stages: DfhPipelineStageState[];
  };
  artifacts: DfhAutopilotArtifacts;
  failureReason?: string;
}

export interface DfhPromptContext {
  request: string;
  paths: DfhAutopilotPaths;
  state: DfhAutopilotState;
}

export interface DfhStageTransitionResult {
  advanced: boolean;
  state: DfhAutopilotState | null;
  previousStage?: DfhPipelineStageState;
  currentStage?: DfhPipelineStageState | null;
}

export interface DfhSignalDetectionResult {
  detected: boolean;
  signal?: string;
  transcriptPath?: string;
}

export const DFH_AUTOPILOT_SIGNALS: Record<DfhPipelineStageId, string> = {
  analyst: 'DFH_STAGE_ANALYST_COMPLETE',
  plan: 'DFH_STAGE_PLAN_COMPLETE',
  execute: 'DFH_STAGE_EXECUTE_COMPLETE',
  qa: 'DFH_STAGE_QA_COMPLETE',
  verify: 'DFH_STAGE_VERIFY_COMPLETE',
};

export const DEFAULT_DFH_AUTOPILOT_CONFIG: Required<
  Omit<DfhAutopilotConfig, 'paths' | 'pipeline'>
> & { pipeline: DfhAutopilotPipelineConfig } = {
  maxIterations: 12,
  pipeline: {
    executionMode: 'parallel',
    runQa: true,
    runValidation: true,
  },
};
