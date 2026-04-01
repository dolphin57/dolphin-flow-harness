/**
 * Dolphin Flow Harness Autopilot Pipeline Helpers
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

import type {
  DfhAutopilotState,
  DfhSignalDetectionResult,
} from './types.js';
import {
  advanceAutopilotStage,
  completeAutopilot,
  getCurrentStage,
  markAutopilotFailed,
  readAutopilotState,
  writeAutopilotState,
} from './state.js';
import type { DfhPipelineStageId } from './types.js';

export function getClaudeConfigDir(): string {
  return process.env.DFH_CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
}

export function getTranscriptCandidates(
  sessionId: string,
  claudeDir = getClaudeConfigDir()
): string[] {
  return [
    join(claudeDir, 'sessions', sessionId, 'transcript.md'),
    join(claudeDir, 'sessions', sessionId, 'messages.json'),
    join(claudeDir, 'transcripts', `${sessionId}.md`),
  ];
}

export function detectSignalInTranscript(
  sessionId: string,
  signal: string,
  claudeDir = getClaudeConfigDir()
): DfhSignalDetectionResult {
  const pattern = new RegExp(signal, 'i');

  for (const candidate of getTranscriptCandidates(sessionId, claudeDir)) {
    if (!existsSync(candidate)) {
      continue;
    }

    try {
      const content = readFileSync(candidate, 'utf-8');
      if (pattern.test(content)) {
        return {
          detected: true,
          signal,
          transcriptPath: candidate,
        };
      }
    } catch {
      continue;
    }
  }

  return { detected: false };
}

function getRequiredArtifactsForStage(
  state: DfhAutopilotState,
  stageId: DfhPipelineStageId
): string[] {
  switch (stageId) {
    case 'analyst':
      return [state.paths.specFile, state.paths.openQuestionsFile];
    case 'plan':
      return [state.paths.planFile];
    default:
      return [];
  }
}

export function getMissingArtifactsForCurrentStage(
  state: DfhAutopilotState
): string[] {
  const currentStage = getCurrentStage(state);
  if (!currentStage) {
    return [];
  }

  const required = getRequiredArtifactsForStage(state, currentStage.id);
  return required.filter(path => !existsSync(path));
}

export function advanceAutopilotFromTranscript(
  directory: string,
  sessionId?: string
): DfhAutopilotState | null {
  if (!sessionId) {
    return readAutopilotState(directory);
  }

  const state = readAutopilotState(directory);
  if (!state || !state.active) {
    return state;
  }

  const currentStage = getCurrentStage(state);
  if (!currentStage) {
    return completeAutopilot(directory);
  }

  const detection = detectSignalInTranscript(sessionId, currentStage.signal);
  if (!detection.detected) {
    return state;
  }

  const missingArtifacts = getMissingArtifactsForCurrentStage(state);
  if (missingArtifacts.length > 0) {
    currentStage.notes = `Signal ${currentStage.signal} detected but missing artifacts: ${missingArtifacts.join(', ')}`;
    writeAutopilotState(directory, state);
    return state;
  }

  const transition = advanceAutopilotStage(directory);
  return transition.state;
}

export function syncAutopilotProgress(
  directory: string,
  sessionId?: string
): DfhAutopilotState | null {
  const state = advanceAutopilotFromTranscript(directory, sessionId);

  if (!state) {
    return null;
  }

  if (state.iteration > state.maxIterations) {
    return markAutopilotFailed(
      directory,
      `max iterations reached (${state.iteration}/${state.maxIterations})`
    );
  }

  return state;
}
