/**
 * DFH Skill Injector
 *
 * This hook is intentionally narrow: it manages the lifecycle of the
 * local DFH autopilot mode by persisting state and injecting the next
 * stage prompt when appropriate.
 */

import {
  buildCompletionPrompt,
  buildContinuationPrompt,
  buildStartPrompt,
  clearAutopilotState,
  ensureAutopilotSummary,
  initAutopilot,
  readAutopilotState,
  syncAutopilotProgress,
} from '../autopilot/index.js';
import {
  createHookOutput,
  extractDirectory,
  extractPrompt,
  getPrimaryKeyword,
} from '../keyword-detector/index.js';
import type { HookInput, HookOutput } from '../keyword-detector/types.js';

function isAutopilotKeyword(prompt: string): boolean {
  const primary = getPrimaryKeyword(prompt)?.type;
  return primary === 'autopilot' || primary === 'dfh-autopilot';
}

function isCancelKeyword(prompt: string): boolean {
  return getPrimaryKeyword(prompt)?.type === 'cancel';
}

function stripLeadingAutopilotKeyword(prompt: string): string {
  return prompt
    .replace(/\b(dfh-autopilot|dfh autopilot|autopilot|auto pilot|auto-pilot)\b\s*:?\s*/i, '')
    .trim();
}

function createSuppressOutput(): HookOutput {
  return {
    continue: true,
    suppressOutput: true,
  };
}

export function processSkillInjection(input: HookInput): HookOutput {
  const prompt = extractPrompt(input);
  const directory = extractDirectory(input);
  const sessionId = input.sessionId ?? input.session_id;

  if (!prompt.trim()) {
    return createSuppressOutput();
  }

  if (isCancelKeyword(prompt)) {
    const existing = readAutopilotState(directory);
    if (!existing?.active) {
      return createSuppressOutput();
    }

    clearAutopilotState(directory);
    return createHookOutput(
      '[DFH AUTOPILOT CANCELLED]\nThe local autopilot state has been cleared.'
    );
  }

  const existing = syncAutopilotProgress(directory, sessionId);

  if (existing?.active) {
    return createHookOutput(buildContinuationPrompt(existing));
  }

  if (existing?.phase === 'complete') {
    const summarized = ensureAutopilotSummary(directory) ?? existing;
    return createHookOutput(buildCompletionPrompt(summarized));
  }

  if (!isAutopilotKeyword(prompt)) {
    return createSuppressOutput();
  }

  const request = stripLeadingAutopilotKeyword(prompt) || prompt.trim();
  const state = initAutopilot(directory, request, sessionId);

  return createHookOutput(buildStartPrompt(state));
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
    const input = await readStdin();
    if (!input.trim()) {
      console.log(JSON.stringify(createSuppressOutput()));
      return;
    }

    let data: HookInput = {};
    try {
      data = JSON.parse(input) as HookInput;
    } catch {
      data = { prompt: input };
    }

    const output = processSkillInjection(data);
    console.log(JSON.stringify(output));
  } catch {
    console.log(JSON.stringify(createSuppressOutput()));
  }
}

if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('skill-injector.mjs')
) {
  void main();
}
