import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import {
  advanceAutopilotFromTranscript,
  buildContinuationPrompt,
  buildStartPrompt,
  detectSignalInTranscript,
  getCurrentStage,
  initAutopilot,
  readAutopilotState,
  resolveAutopilotPaths,
} from '../index.js';

describe('DFH autopilot state', () => {
  let workdir: string;
  let claudeDir: string;

  beforeEach(() => {
    workdir = mkdtempSync(join(tmpdir(), 'dfh-autopilot-'));
    claudeDir = mkdtempSync(join(tmpdir(), 'dfh-claude-'));
    process.env.DFH_CLAUDE_CONFIG_DIR = claudeDir;
  });

  afterEach(() => {
    rmSync(workdir, { recursive: true, force: true });
    rmSync(claudeDir, { recursive: true, force: true });
    delete process.env.DFH_CLAUDE_CONFIG_DIR;
  });

  it('initializes a pipeline with analyst stage active', () => {
    const state = initAutopilot(workdir, 'build a workflow engine', 'session-1');

    expect(state.phase).toBe('expansion');
    expect(state.pipeline.stages).toHaveLength(5);
    expect(getCurrentStage(state)?.id).toBe('analyst');
  });

  it('advances to the next stage when the transcript contains the current signal', () => {
    const state = initAutopilot(workdir, 'build a workflow engine', 'session-2');
    const stage = getCurrentStage(state);
    writeFileSync(state.paths.specFile, '# spec', 'utf-8');
    writeFileSync(state.paths.openQuestionsFile, '# open questions', 'utf-8');

    mkdirSync(join(claudeDir, 'sessions', 'session-2'), { recursive: true });
    writeFileSync(
      join(claudeDir, 'sessions', 'session-2', 'transcript.md'),
      `work done\n${stage?.signal}\n`,
      'utf-8'
    );

    const nextState = advanceAutopilotFromTranscript(workdir, 'session-2');

    expect(nextState?.phase).toBe('planning');
    expect(getCurrentStage(nextState!)?.id).toBe('plan');
  });

  it('detects signals from candidate transcript files', () => {
    mkdirSync(join(claudeDir, 'transcripts'), { recursive: true });
    writeFileSync(
      join(claudeDir, 'transcripts', 'session-3.md'),
      'hello DFH_STAGE_PLAN_COMPLETE',
      'utf-8'
    );

    const result = detectSignalInTranscript('session-3', 'DFH_STAGE_PLAN_COMPLETE');

    expect(result.detected).toBe(true);
    expect(result.transcriptPath).toContain('session-3.md');
  });

  it('includes state paths in the start and continuation prompts', () => {
    const state = initAutopilot(workdir, 'build a workflow engine', 'session-4');

    const startPrompt = buildStartPrompt(state);
    const continuationPrompt = buildContinuationPrompt(state);

    expect(startPrompt).toContain(state.paths.stateFile);
    expect(continuationPrompt).toContain('DFH AUTOPILOT CONTINUE');
    expect(continuationPrompt).toContain(state.paths.specFile);
  });

  it('persists state to the expected .dfh location', () => {
    initAutopilot(workdir, 'build a workflow engine');

    const paths = resolveAutopilotPaths(workdir);
    const persisted = JSON.parse(readFileSync(paths.stateFile, 'utf-8')) as {
      originalRequest: string;
    };

    expect(paths.stateFile).toContain('.dfh');
    expect(persisted.originalRequest).toBe('build a workflow engine');
    expect(readAutopilotState(workdir)?.phase).toBe('expansion');
  });
});
