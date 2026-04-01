import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { execSync } from 'child_process';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { initAutopilot, readAutopilotState } from '../../autopilot/index.js';
import { processAutopilotStopHook } from '../index.js';

function ensureTranscript(claudeDir: string, sessionId: string, content: string): void {
  mkdirSync(join(claudeDir, 'sessions', sessionId), { recursive: true });
  writeFileSync(join(claudeDir, 'sessions', sessionId, 'transcript.md'), content, 'utf-8');
}

describe('autopilot stop hook', () => {
  let workdir: string;
  let claudeDir: string;

  beforeEach(() => {
    workdir = mkdtempSync(join(tmpdir(), 'dfh-stop-hook-'));
    claudeDir = mkdtempSync(join(tmpdir(), 'dfh-claude-stop-'));
    process.env.DFH_CLAUDE_CONFIG_DIR = claudeDir;
  });

  afterEach(() => {
    rmSync(workdir, { recursive: true, force: true });
    rmSync(claudeDir, { recursive: true, force: true });
    delete process.env.DFH_CLAUDE_CONFIG_DIR;
  });

  it('allows stop when no autopilot state exists', () => {
    const result = processAutopilotStopHook({
      cwd: workdir,
      sessionId: 'no-state',
      hookEventName: 'Stop',
    });

    expect(result.continue).toBe(true);
  });

  it('blocks stop and injects continuation when autopilot is active', () => {
    initAutopilot(workdir, 'build workflow', 'active-session');

    const result = processAutopilotStopHook({
      cwd: workdir,
      sessionId: 'active-session',
      hookEventName: 'Stop',
    });

    expect(result.continue).toBe(false);
    expect(result.message).toContain('DFH AUTOPILOT CONTINUE');
  });

  it('requires stage files before advancing from analyst to planning', () => {
    const state = initAutopilot(workdir, 'build workflow', 'artifact-guard');

    ensureTranscript(
      claudeDir,
      'artifact-guard',
      `...\n${state.pipeline.stages[0].signal}\n...`
    );

    const result = processAutopilotStopHook({
      cwd: workdir,
      sessionId: 'artifact-guard',
      hookEventName: 'Stop',
    });

    expect(result.continue).toBe(false);
    expect(result.message).toContain('ARTIFACT GUARD');
    expect(readAutopilotState(workdir)?.phase).toBe('expansion');
  });

  it('advances stages only after expected files are generated', () => {
    execSync('git init', { cwd: workdir, stdio: 'ignore' });
    const state = initAutopilot(workdir, 'build workflow', 'stage-files');

    writeFileSync(state.paths.specFile, '# spec', 'utf-8');
    writeFileSync(
      state.paths.openQuestionsFile,
      '# open questions\n- [ ] Confirm retention policy',
      'utf-8'
    );
    ensureTranscript(
      claudeDir,
      'stage-files',
      `...\n${state.pipeline.stages[0].signal}\n...`
    );
    processAutopilotStopHook({ cwd: workdir, sessionId: 'stage-files', hookEventName: 'Stop' });
    expect(readAutopilotState(workdir)?.phase).toBe('planning');

    const planningState = readAutopilotState(workdir)!;
    writeFileSync(
      planningState.paths.planFile,
      '# plan\n## Risks\n- Integration may break in legacy module',
      'utf-8'
    );
    ensureTranscript(
      claudeDir,
      'stage-files',
      `...\n${planningState.pipeline.stages[1].signal}\n...`
    );
    processAutopilotStopHook({ cwd: workdir, sessionId: 'stage-files', hookEventName: 'Stop' });
    expect(readAutopilotState(workdir)?.phase).toBe('execution');

    const executionState = readAutopilotState(workdir)!;
    ensureTranscript(
      claudeDir,
      'stage-files',
      `...\n${executionState.pipeline.stages[2].signal}\n...`
    );
    processAutopilotStopHook({ cwd: workdir, sessionId: 'stage-files', hookEventName: 'Stop' });
    expect(readAutopilotState(workdir)?.phase).toBe('qa');

    const qaState = readAutopilotState(workdir)!;
    ensureTranscript(
      claudeDir,
      'stage-files',
      `...\n${qaState.pipeline.stages[3].signal}\n...`
    );
    processAutopilotStopHook({ cwd: workdir, sessionId: 'stage-files', hookEventName: 'Stop' });
    expect(readAutopilotState(workdir)?.phase).toBe('validation');

    const validationState = readAutopilotState(workdir)!;
    ensureTranscript(
      claudeDir,
      'stage-files',
      `...\n${validationState.pipeline.stages[4].signal}\n...`
    );
    const finalResult = processAutopilotStopHook({
      cwd: workdir,
      sessionId: 'stage-files',
      hookEventName: 'Stop',
    });

    expect(finalResult.continue).toBe(true);
    const completedState = readAutopilotState(workdir)!;
    expect(completedState.phase).toBe('complete');
    expect(existsSync(completedState.paths.summaryFile)).toBe(true);

    const summary = readFileSync(completedState.paths.summaryFile, 'utf-8');
    expect(summary).toContain('## Artifact Paths');
    expect(summary).toContain(completedState.paths.specFile);
    expect(summary).toContain('## Modified Files');
    expect(summary).toContain('## Risks');
    expect(summary).toContain('Integration may break in legacy module');
    expect(summary).toContain('## Unresolved Issues');
    expect(summary).toContain('Confirm retention policy');
  });
});
