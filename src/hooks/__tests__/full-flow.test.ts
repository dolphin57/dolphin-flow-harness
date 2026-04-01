import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import {
  advanceAutopilotFromTranscript,
  advanceAutopilotStage,
  buildCompletionPrompt,
  buildContinuationPrompt,
  buildStartPrompt,
  completeAutopilot,
  getCurrentStage,
  initAutopilot,
  readAutopilotState,
  resolveAutopilotPaths,
  syncAutopilotProgress,
  writeAutopilotState,
} from '../autopilot/index.js';
import { processSkillInjection } from '../skill-injector/index.js';
import type { DfhAutopilotState, HookInput } from '../keyword-detector/types.js';

describe('DFH autopilot full flow integration', () => {
  let workdir: string;
  let claudeDir: string;

  beforeEach(() => {
    workdir = mkdtempSync(join(tmpdir(), 'dfh-full-flow-'));
    claudeDir = mkdtempSync(join(tmpdir(), 'dfh-claude-'));
    process.env.DFH_CLAUDE_CONFIG_DIR = claudeDir;
  });

  afterEach(() => {
    rmSync(workdir, { recursive: true, force: true });
    rmSync(claudeDir, { recursive: true, force: true });
    delete process.env.DFH_CLAUDE_CONFIG_DIR;
  });

  describe('file generation', () => {
    it('creates .dfh/autopilot directory on init', () => {
      initAutopilot(workdir, 'test request', 'session-1');

      const paths = resolveAutopilotPaths(workdir);
      expect(existsSync(paths.rootDir)).toBe(true);
    });

    it('creates state.json with correct structure', () => {
      const state = initAutopilot(workdir, 'build a workflow engine', 'session-2');

      const paths = resolveAutopilotPaths(workdir);
      expect(existsSync(paths.stateFile)).toBe(true);

      const savedState = JSON.parse(readFileSync(paths.stateFile, 'utf-8')) as DfhAutopilotState;
      
      expect(savedState.originalRequest).toBe('build a workflow engine');
      expect(savedState.active).toBe(true);
      expect(savedState.phase).toBe('expansion');
      expect(savedState.pipeline.stages).toHaveLength(5);
      expect(savedState.paths.specFile).toContain('spec.md');
      expect(savedState.paths.planFile).toContain('plan.md');
      expect(savedState.paths.openQuestionsFile).toContain('open-questions.md');
    });

    it('updates state.json after stage advancement', () => {
      initAutopilot(workdir, 'test', 'session-3');
      
      advanceAutopilotStage(workdir);

      const paths = resolveAutopilotPaths(workdir);
      const savedState = JSON.parse(readFileSync(paths.stateFile, 'utf-8')) as DfhAutopilotState;
      
      expect(savedState.phase).toBe('planning');
      expect(savedState.pipeline.stages[0].status).toBe('complete');
      expect(savedState.pipeline.stages[1].status).toBe('active');
    });
  });

  describe('complete autopilot flow', () => {
    it('simulates complete 5-stage flow with file outputs', () => {
      const sessionId = 'session-full-flow';
      const request = 'implement user authentication';

      const input: HookInput = {
        prompt: `autopilot: ${request}`,
        cwd: workdir,
        sessionId,
      };

      const startResult = processSkillInjection(input);
      expect(startResult.hookSpecificOutput?.additionalContext).toContain('DFH AUTOPILOT STARTED');

      let state = readAutopilotState(workdir)!;
      expect(state.phase).toBe('expansion');

      const paths = state.paths;

      writeFileSync(paths.specFile, '# Spec\n\nUser authentication requirements...', 'utf-8');
      writeFileSync(paths.openQuestionsFile, '# Open Questions\n\n- How to handle OAuth?', 'utf-8');

      mkdirSync(join(claudeDir, 'sessions', sessionId), { recursive: true });
      writeFileSync(
        join(claudeDir, 'sessions', sessionId, 'transcript.md'),
        `Analysis complete\nDFH_STAGE_ANALYST_COMPLETE\n`,
        'utf-8'
      );

      state = syncAutopilotProgress(workdir, sessionId)!;
      expect(state.phase).toBe('planning');
      expect(getCurrentStage(state)?.id).toBe('plan');

      writeFileSync(paths.planFile, '# Plan\n\n1. Create auth module\n2. Add tests', 'utf-8');
      writeFileSync(
        join(claudeDir, 'sessions', sessionId, 'transcript.md'),
        `Plan created\nDFH_STAGE_PLAN_COMPLETE\n`,
        'utf-8'
      );

      state = syncAutopilotProgress(workdir, sessionId)!;
      expect(state.phase).toBe('execution');
      expect(getCurrentStage(state)?.id).toBe('execute');

      state.artifacts.filesCreated = ['src/auth/login.ts', 'src/auth/logout.ts'];
      state.artifacts.filesModified = ['src/index.ts'];
      writeAutopilotState(workdir, state);
      
      writeFileSync(
        join(claudeDir, 'sessions', sessionId, 'transcript.md'),
        `Implementation done\nDFH_STAGE_EXECUTE_COMPLETE\n`,
        'utf-8'
      );

      state = syncAutopilotProgress(workdir, sessionId)!;
      expect(state.phase).toBe('qa');
      expect(getCurrentStage(state)?.id).toBe('qa');

      writeFileSync(
        join(claudeDir, 'sessions', sessionId, 'transcript.md'),
        `Tests passed\nDFH_STAGE_QA_COMPLETE\n`,
        'utf-8'
      );

      state = syncAutopilotProgress(workdir, sessionId)!;
      expect(state.phase).toBe('validation');
      expect(getCurrentStage(state)?.id).toBe('verify');

      writeFileSync(
        join(claudeDir, 'sessions', sessionId, 'transcript.md'),
        `Validation complete\nDFH_STAGE_VERIFY_COMPLETE\n`,
        'utf-8'
      );

      state = syncAutopilotProgress(workdir, sessionId)!;
      expect(state.phase).toBe('complete');
      expect(state.active).toBe(false);

      expect(existsSync(paths.stateFile)).toBe(true);
      expect(existsSync(paths.specFile)).toBe(true);
      expect(existsSync(paths.planFile)).toBe(true);
      expect(existsSync(paths.openQuestionsFile)).toBe(true);

      const finalState = readAutopilotState(workdir)!;
      expect(finalState.artifacts.filesCreated).toHaveLength(2);
      expect(finalState.artifacts.filesModified).toHaveLength(1);
    });

    it('handles cancellation during flow', () => {
      const sessionId = 'session-cancel-flow';
      
      processSkillInjection({
        prompt: 'autopilot: build something',
        cwd: workdir,
        sessionId,
      });

      expect(readAutopilotState(workdir)?.active).toBe(true);

      const cancelResult = processSkillInjection({
        prompt: 'cancelomc',
        cwd: workdir,
        sessionId,
      });

      expect(cancelResult.hookSpecificOutput?.additionalContext).toContain('CANCELLED');
      expect(readAutopilotState(workdir)).toBeNull();
    });

    it('handles failure during flow', () => {
      const sessionId = 'session-fail-flow';
      
      processSkillInjection({
        prompt: 'autopilot: build something',
        cwd: workdir,
        sessionId,
      });

      const state = readAutopilotState(workdir)!;
      state.iteration = 15;
      state.maxIterations = 12;
      writeAutopilotState(workdir, state);

      const result = syncAutopilotProgress(workdir, sessionId);

      expect(result?.phase).toBe('failed');
      expect(result?.failureReason).toContain('max iterations');
    });
  });

  describe('continuation scenarios', () => {
    it('continues from saved state on new session', () => {
      const sessionId1 = 'session-continue-1';
      
      processSkillInjection({
        prompt: 'autopilot: build feature',
        cwd: workdir,
        sessionId: sessionId1,
      });

      advanceAutopilotStage(workdir);
      const stateAfterAdvance = readAutopilotState(workdir)!;
      expect(stateAfterAdvance.phase).toBe('planning');

      const sessionId2 = 'session-continue-2';
      const continueResult = processSkillInjection({
        prompt: 'continue working',
        cwd: workdir,
        sessionId: sessionId2,
      });

      expect(continueResult.hookSpecificOutput?.additionalContext).toContain('AUTOPILOT CONTINUE');
      expect(continueResult.hookSpecificOutput?.additionalContext).toContain('Planning');
    });

    it('shows completion summary when already complete', () => {
      const sessionId = 'session-complete-summary';
      
      processSkillInjection({
        prompt: 'autopilot: build feature',
        cwd: workdir,
        sessionId,
      });

      for (let i = 0; i < 5; i++) {
        advanceAutopilotStage(workdir);
      }

      const completeResult = processSkillInjection({
        prompt: 'what happened?',
        cwd: workdir,
        sessionId,
      });

      expect(completeResult.hookSpecificOutput?.additionalContext).toContain('AUTOPILOT COMPLETE');
    });
  });

  describe('path configuration', () => {
    it('uses custom paths when provided', () => {
      const customConfig = {
        paths: {
          specFile: 'custom-spec.md',
          planFile: 'custom-plan.md',
          openQuestionsFile: 'custom-questions.md',
        },
      };

      const state = initAutopilot(workdir, 'test', 'session-custom', customConfig);

      expect(state.paths.specFile).toContain('custom-spec.md');
      expect(state.paths.planFile).toContain('custom-plan.md');
      expect(state.paths.openQuestionsFile).toContain('custom-questions.md');
    });

    it('resolves paths relative to workdir', () => {
      const state = initAutopilot(workdir, 'test', 'session-paths');

      expect(state.paths.rootDir).toBe(resolve(workdir, '.dfh/autopilot'));
      expect(state.paths.stateFile).toBe(resolve(workdir, '.dfh/autopilot/state.json'));
    });
  });

  describe('stage signals', () => {
    it('each stage has unique signal', () => {
      const state = initAutopilot(workdir, 'test', 'session-signals');

      const signals = state.pipeline.stages.map(s => s.signal);
      const uniqueSignals = new Set(signals);

      expect(uniqueSignals.size).toBe(5);
      expect(signals).toContain('DFH_STAGE_ANALYST_COMPLETE');
      expect(signals).toContain('DFH_STAGE_PLAN_COMPLETE');
      expect(signals).toContain('DFH_STAGE_EXECUTE_COMPLETE');
      expect(signals).toContain('DFH_STAGE_QA_COMPLETE');
      expect(signals).toContain('DFH_STAGE_VERIFY_COMPLETE');
    });
  });
});
