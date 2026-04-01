/**
 * DFH Autopilot Stop Hook
 *
 * Enforces autonomous continuation on Stop/SubagentStop events so autopilot
 * progresses without waiting for the next user prompt.
 */

import {
  buildCompletionPrompt,
  buildContinuationPrompt,
  ensureAutopilotSummary,
  getCurrentStage,
  getMissingArtifactsForCurrentStage,
  incrementAutopilotIteration,
  markAutopilotFailed,
  syncAutopilotProgress,
} from '../autopilot/index.js';
import { extractDirectory } from '../keyword-detector/index.js';
import type { HookInput } from '../keyword-detector/types.js';

export interface StopHookInput extends HookInput {
  hook_event_name?: string;
  hookEventName?: string;
  stop_reason?: string;
  stopReason?: string;
}

export interface StopHookOutput {
  continue: boolean;
  message?: string;
}

function createAllowStop(message?: string): StopHookOutput {
  return message ? { continue: true, message } : { continue: true };
}

function createBlockStop(message: string): StopHookOutput {
  return { continue: false, message };
}

function buildMissingArtifactsMessage(
  missingArtifacts: string[],
  stageLabel: string
): string {
  return `<dfh-autopilot-artifact-guard>
[DFH AUTOPILOT CONTINUE - ARTIFACT GUARD]

Current stage: ${stageLabel}
The completion signal was detected, but required stage artifacts are missing:
${missingArtifacts.map(path => `- ${path}`).join('\n')}

Do not transition yet. Generate the missing files, then emit the stage signal again.
</dfh-autopilot-artifact-guard>`;
}

export function processAutopilotStopHook(input: StopHookInput): StopHookOutput {
  const directory = extractDirectory(input);
  const sessionId = input.sessionId ?? input.session_id;

  const state = syncAutopilotProgress(directory, sessionId);
  if (!state) {
    return createAllowStop();
  }

  if (state.phase === 'failed') {
    return createAllowStop(
      `[DFH AUTOPILOT FAILED] ${state.failureReason ?? 'unknown failure'}`
    );
  }

  if (state.phase === 'complete' || !state.active) {
    const summarized = ensureAutopilotSummary(directory) ?? state;
    return createAllowStop(buildCompletionPrompt(summarized));
  }

  const missingArtifacts = getMissingArtifactsForCurrentStage(state);
  if (missingArtifacts.length > 0) {
    const currentStage = getCurrentStage(state);
    return createBlockStop(
      buildMissingArtifactsMessage(
        missingArtifacts,
        currentStage?.id ?? state.phase
      )
    );
  }

  const progressed = incrementAutopilotIteration(directory) ?? state;
  if (progressed.iteration > progressed.maxIterations) {
    const failed = markAutopilotFailed(
      directory,
      `max iterations reached (${progressed.iteration}/${progressed.maxIterations})`
    );
    return createAllowStop(
      `[DFH AUTOPILOT FAILED] ${failed?.failureReason ?? 'max iterations reached'}`
    );
  }

  return createBlockStop(buildContinuationPrompt(progressed));
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString('utf-8');
}

export async function main(): Promise<void> {
  try {
    const raw = await readStdin();
    if (!raw.trim()) {
      console.log(JSON.stringify(createAllowStop()));
      return;
    }

    let input: StopHookInput = {};
    try {
      input = JSON.parse(raw) as StopHookInput;
    } catch {
      input = {};
    }

    const output = processAutopilotStopHook(input);
    console.log(JSON.stringify(output));
  } catch {
    console.log(JSON.stringify(createAllowStop()));
  }
}

if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('autopilot-stop-hook.mjs')
) {
  void main();
}
