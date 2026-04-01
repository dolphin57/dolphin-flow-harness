import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import {
  buildCompletionPrompt,
  buildContinuationPrompt,
  buildStartPrompt,
  getExpansionPrompt,
  getExecutionPrompt,
  getPlanningPrompt,
  getQaPrompt,
  getValidationPrompt,
  getStagePrompt,
  formatPipelineHud,
  getCurrentStageSignal,
  initAutopilot,
  getCurrentStage,
  advanceAutopilotStage,
  readAutopilotState,
} from '../index.js';

describe('DFH autopilot prompts', () => {
  let workdir: string;

  beforeEach(() => {
    workdir = mkdtempSync(join(tmpdir(), 'dfh-prompts-'));
  });

  afterEach(() => {
    rmSync(workdir, { recursive: true, force: true });
  });

  describe('stage prompts', () => {
    it('generates expansion prompt with correct content', () => {
      const state = initAutopilot(workdir, 'build a login system', 'session-1');
      const context = {
        request: state.originalRequest,
        paths: state.paths,
        state,
      };

      const prompt = getExpansionPrompt(context);

      expect(prompt).toContain('STAGE 0');
      expect(prompt).toContain('REQUIREMENT EXPANSION');
      expect(prompt).toContain('build a login system');
      expect(prompt).toContain(state.paths.specFile);
      expect(prompt).toContain(state.paths.openQuestionsFile);
      expect(prompt).toContain('DFH_STAGE_ANALYST_COMPLETE');
    });

    it('generates planning prompt with correct content', () => {
      const state = initAutopilot(workdir, 'build a login system', 'session-2');
      advanceAutopilotStage(workdir);
      const updatedState = readAutopilotState(workdir)!;
      
      const context = {
        request: updatedState.originalRequest,
        paths: updatedState.paths,
        state: updatedState,
      };

      const prompt = getPlanningPrompt(context);

      expect(prompt).toContain('STAGE 1');
      expect(prompt).toContain('IMPLEMENTATION PLANNING');
      expect(prompt).toContain(updatedState.paths.specFile);
      expect(prompt).toContain(updatedState.paths.planFile);
      expect(prompt).toContain('DFH_STAGE_PLAN_COMPLETE');
    });

    it('generates execution prompt with correct content', () => {
      const state = initAutopilot(workdir, 'build a login system', 'session-3');
      advanceAutopilotStage(workdir);
      advanceAutopilotStage(workdir);
      const updatedState = readAutopilotState(workdir)!;
      
      const context = {
        request: updatedState.originalRequest,
        paths: updatedState.paths,
        state: updatedState,
      };

      const prompt = getExecutionPrompt(context);

      expect(prompt).toContain('STAGE 2');
      expect(prompt).toContain('EXECUTION');
      expect(prompt).toContain(updatedState.paths.planFile);
      expect(prompt).toContain('DFH_STAGE_EXECUTE_COMPLETE');
      expect(prompt).toContain('parallel');
    });

    it('generates execution prompt with solo mode', () => {
      const state = initAutopilot(workdir, 'build a login system', 'session-4', {
        pipeline: {
          executionMode: 'solo',
          runQa: true,
          runValidation: true,
        },
      });
      
      const context = {
        request: state.originalRequest,
        paths: state.paths,
        state,
      };

      const prompt = getExecutionPrompt(context);

      expect(prompt).toContain('solo');
    });

    it('generates QA prompt with correct content', () => {
      const state = initAutopilot(workdir, 'build a login system', 'session-5');
      advanceAutopilotStage(workdir);
      advanceAutopilotStage(workdir);
      advanceAutopilotStage(workdir);
      const updatedState = readAutopilotState(workdir)!;
      
      const context = {
        request: updatedState.originalRequest,
        paths: updatedState.paths,
        state: updatedState,
      };

      const prompt = getQaPrompt(context);

      expect(prompt).toContain('STAGE 3');
      expect(prompt).toContain('QA');
      expect(prompt).toContain('Build');
      expect(prompt).toContain('Unit tests');
      expect(prompt).toContain('DFH_STAGE_QA_COMPLETE');
    });

    it('generates validation prompt with correct content', () => {
      const state = initAutopilot(workdir, 'build a login system', 'session-6');
      advanceAutopilotStage(workdir);
      advanceAutopilotStage(workdir);
      advanceAutopilotStage(workdir);
      advanceAutopilotStage(workdir);
      const updatedState = readAutopilotState(workdir)!;
      
      const context = {
        request: updatedState.originalRequest,
        paths: updatedState.paths,
        state: updatedState,
      };

      const prompt = getValidationPrompt(context);

      expect(prompt).toContain('STAGE 4');
      expect(prompt).toContain('VALIDATION');
      expect(prompt).toContain(updatedState.paths.specFile);
      expect(prompt).toContain(updatedState.paths.planFile);
      expect(prompt).toContain('DFH_STAGE_VERIFY_COMPLETE');
    });

    it('requires modification points in every stage prompt', () => {
      const expansionState = initAutopilot(workdir, 'build a login system', 'session-6b');
      const planningState = (() => {
        advanceAutopilotStage(workdir);
        return readAutopilotState(workdir)!;
      })();
      const executionState = (() => {
        advanceAutopilotStage(workdir);
        return readAutopilotState(workdir)!;
      })();
      const qaState = (() => {
        advanceAutopilotStage(workdir);
        return readAutopilotState(workdir)!;
      })();
      const validationState = (() => {
        advanceAutopilotStage(workdir);
        return readAutopilotState(workdir)!;
      })();

      const prompts = [
        getExpansionPrompt({
          request: expansionState.originalRequest,
          paths: expansionState.paths,
          state: expansionState,
        }),
        getPlanningPrompt({
          request: planningState.originalRequest,
          paths: planningState.paths,
          state: planningState,
        }),
        getExecutionPrompt({
          request: executionState.originalRequest,
          paths: executionState.paths,
          state: executionState,
        }),
        getQaPrompt({
          request: qaState.originalRequest,
          paths: qaState.paths,
          state: qaState,
        }),
        getValidationPrompt({
          request: validationState.originalRequest,
          paths: validationState.paths,
          state: validationState,
        }),
      ];

      for (const prompt of prompts) {
        expect(prompt).toContain('Modification Points');
        expect(prompt).toContain('(none yet)');
      }
    });
  });

  describe('getStagePrompt', () => {
    it('returns expansion prompt for expansion phase', () => {
      const state = initAutopilot(workdir, 'test', 'session-7');
      
      const prompt = getStagePrompt(state);

      expect(prompt).toContain('REQUIREMENT EXPANSION');
    });

    it('returns planning prompt for planning phase', () => {
      const state = initAutopilot(workdir, 'test', 'session-8');
      advanceAutopilotStage(workdir);
      const updatedState = readAutopilotState(workdir)!;

      const prompt = getStagePrompt(updatedState);

      expect(prompt).toContain('IMPLEMENTATION PLANNING');
    });

    it('returns complete message for complete phase', () => {
      const state = initAutopilot(workdir, 'test', 'session-9');
      advanceAutopilotStage(workdir);
      advanceAutopilotStage(workdir);
      advanceAutopilotStage(workdir);
      advanceAutopilotStage(workdir);
      advanceAutopilotStage(workdir);
      const result = readAutopilotState(workdir)!;

      const prompt = getStagePrompt(result);

      expect(prompt).toContain('already complete');
    });

    it('returns failure message for failed phase', () => {
      const state = initAutopilot(workdir, 'test', 'session-10');
      state.phase = 'failed';
      state.failureReason = 'Test failure';

      const prompt = getStagePrompt(state);

      expect(prompt).toContain('failed');
      expect(prompt).toContain('Test failure');
    });
  });

  describe('HUD formatting', () => {
    it('formats pipeline HUD correctly', () => {
      const state = initAutopilot(workdir, 'test', 'session-11');

      const hud = formatPipelineHud(state);

      expect(hud).toContain('DFH Pipeline');
      expect(hud).toContain('1/5');
      expect(hud).toContain('[>>]');
      expect(hud).toContain('Expansion');
      expect(hud).toContain('[..]');
    });

    it('shows completed stages with [OK]', () => {
      const state = initAutopilot(workdir, 'test', 'session-12');
      advanceAutopilotStage(workdir);
      const updatedState = readAutopilotState(workdir)!;

      const hud = formatPipelineHud(updatedState);

      expect(hud).toContain('[OK]');
      expect(hud).toContain('[>>]');
    });
  });

  describe('signal retrieval', () => {
    it('returns current stage signal', () => {
      const state = initAutopilot(workdir, 'test', 'session-13');

      const signal = getCurrentStageSignal(state);

      expect(signal).toBe('DFH_STAGE_ANALYST_COMPLETE');
    });

    it('returns verify signal when in validation phase', () => {
      const state = initAutopilot(workdir, 'test', 'session-14');
      advanceAutopilotStage(workdir);
      advanceAutopilotStage(workdir);
      advanceAutopilotStage(workdir);
      advanceAutopilotStage(workdir);
      const updatedState = readAutopilotState(workdir)!;

      const signal = getCurrentStageSignal(updatedState);

      expect(signal).toBe('DFH_STAGE_VERIFY_COMPLETE');
    });
  });

  describe('build prompts', () => {
    it('builds start prompt with all required elements', () => {
      const state = initAutopilot(workdir, 'build a feature', 'session-15');

      const prompt = buildStartPrompt(state);

      expect(prompt).toContain('dfh-autopilot-start');
      expect(prompt).toContain('DFH AUTOPILOT STARTED');
      expect(prompt).toContain(state.paths.stateFile);
      expect(prompt).toContain('build a feature');
      expect(prompt).toContain('DFH_STAGE_ANALYST_COMPLETE');
    });

    it('builds continuation prompt with iteration info', () => {
      const state = initAutopilot(workdir, 'build a feature', 'session-16');
      state.iteration = 3;

      const prompt = buildContinuationPrompt(state);

      expect(prompt).toContain('dfh-autopilot-continuation');
      expect(prompt).toContain('DFH AUTOPILOT CONTINUE');
      expect(prompt).toContain('Iteration: 3/');
      expect(prompt).toContain('Expansion');
    });

    it('builds completion prompt with artifacts', () => {
      const state = initAutopilot(workdir, 'build a feature', 'session-17');
      state.artifacts.filesCreated = ['file1.ts', 'file2.ts'];
      state.artifacts.filesModified = ['file3.ts'];

      const prompt = buildCompletionPrompt(state);

      expect(prompt).toContain('dfh-autopilot-complete');
      expect(prompt).toContain('DFH AUTOPILOT COMPLETE');
      expect(prompt).toContain('build a feature');
      expect(prompt).toContain('Files created: 2');
      expect(prompt).toContain('Files modified: 1');
    });
  });
});
