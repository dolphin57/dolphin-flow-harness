import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import {
  advanceAutopilotStage,
  advanceAutopilotFromTranscript,
  completeAutopilot,
  detectSignalInTranscript,
  getCurrentStage,
  initAutopilot,
  markAutopilotFailed,
  readAutopilotState,
  resolveAutopilotPaths,
  syncAutopilotProgress,
  writeAutopilotState,
} from '../index.js';
import type { DfhAutopilotState } from '../types.js';

describe('DFH autopilot pipeline', () => {
  let workdir: string;
  let claudeDir: string;

  beforeEach(() => {
    workdir = mkdtempSync(join(tmpdir(), 'dfh-pipeline-'));
    claudeDir = mkdtempSync(join(tmpdir(), 'dfh-claude-'));
    process.env.DFH_CLAUDE_CONFIG_DIR = claudeDir;
  });

  afterEach(() => {
    rmSync(workdir, { recursive: true, force: true });
    rmSync(claudeDir, { recursive: true, force: true });
    delete process.env.DFH_CLAUDE_CONFIG_DIR;
  });

  describe('stage advancement', () => {
    it('advances from analyst to plan stage', () => {
      const state = initAutopilot(workdir, 'test request', 'session-1');
      
      expect(state.phase).toBe('expansion');
      expect(getCurrentStage(state)?.id).toBe('analyst');
      expect(getCurrentStage(state)?.status).toBe('active');

      const result = advanceAutopilotStage(workdir);

      expect(result.advanced).toBe(true);
      expect(result.previousStage?.id).toBe('analyst');
      expect(result.previousStage?.status).toBe('complete');
      expect(result.currentStage?.id).toBe('plan');
      expect(result.currentStage?.status).toBe('active');
      expect(result.state?.phase).toBe('planning');
    });

    it('advances through all stages to completion', () => {
      const state = initAutopilot(workdir, 'test request', 'session-2');
      
      const stages = ['analyst', 'plan', 'execute', 'qa', 'verify'];
      let currentState: DfhAutopilotState | null = state;

      for (let i = 0; i < stages.length; i++) {
        const currentStage = getCurrentStage(currentState!);
        expect(currentStage?.id).toBe(stages[i]);
        expect(currentStage?.status).toBe('active');

        const result = advanceAutopilotStage(workdir);
        currentState = result.state;
      }

      expect(currentState?.phase).toBe('complete');
      expect(currentState?.active).toBe(false);
      expect(currentState?.completedAt).not.toBeNull();
    });

    it('skips qa and validation stages when configured', () => {
      const state = initAutopilot(workdir, 'test request', 'session-3', {
        pipeline: {
          executionMode: 'solo',
          runQa: false,
          runValidation: false,
        },
      });

      const qaStage = state.pipeline.stages.find(s => s.id === 'qa');
      const verifyStage = state.pipeline.stages.find(s => s.id === 'verify');

      expect(qaStage?.status).toBe('skipped');
      expect(verifyStage?.status).toBe('skipped');

      advanceAutopilotStage(workdir);
      advanceAutopilotStage(workdir);
      const result = advanceAutopilotStage(workdir);

      expect(result.state?.phase).toBe('complete');
    });
  });

  describe('signal detection', () => {
    it('detects signal in sessions transcript', () => {
      mkdirSync(join(claudeDir, 'sessions', 'session-signal'), { recursive: true });
      writeFileSync(
        join(claudeDir, 'sessions', 'session-signal', 'transcript.md'),
        'Some work done\nDFH_STAGE_ANALYST_COMPLETE\nMore text',
        'utf-8'
      );

      const result = detectSignalInTranscript('session-signal', 'DFH_STAGE_ANALYST_COMPLETE');

      expect(result.detected).toBe(true);
      expect(result.signal).toBe('DFH_STAGE_ANALYST_COMPLETE');
      expect(result.transcriptPath).toContain('transcript.md');
    });

    it('detects signal in transcripts folder', () => {
      mkdirSync(join(claudeDir, 'transcripts'), { recursive: true });
      writeFileSync(
        join(claudeDir, 'transcripts', 'session-alt.md'),
        'Work\nDFH_STAGE_PLAN_COMPLETE\nDone',
        'utf-8'
      );

      const result = detectSignalInTranscript('session-alt', 'DFH_STAGE_PLAN_COMPLETE');

      expect(result.detected).toBe(true);
    });

    it('returns false when signal not found', () => {
      mkdirSync(join(claudeDir, 'sessions', 'session-no-signal'), { recursive: true });
      writeFileSync(
        join(claudeDir, 'sessions', 'session-no-signal', 'transcript.md'),
        'No signal here',
        'utf-8'
      );

      const result = detectSignalInTranscript('session-no-signal', 'DFH_STAGE_ANALYST_COMPLETE');

      expect(result.detected).toBe(false);
    });

    it('returns false when transcript does not exist', () => {
      const result = detectSignalInTranscript('nonexistent-session', 'DFH_STAGE_ANALYST_COMPLETE');

      expect(result.detected).toBe(false);
    });
  });

  describe('transcript-based advancement', () => {
    it('advances stage when signal is detected in transcript', () => {
      const state = initAutopilot(workdir, 'test request', 'session-advance');
      
      writeFileSync(state.paths.specFile, '# Spec', 'utf-8');
      writeFileSync(state.paths.openQuestionsFile, '# Questions', 'utf-8');
      
      mkdirSync(join(claudeDir, 'sessions', 'session-advance'), { recursive: true });
      writeFileSync(
        join(claudeDir, 'sessions', 'session-advance', 'transcript.md'),
        `Work done\n${getCurrentStage(state)?.signal}\n`,
        'utf-8'
      );

      const nextState = advanceAutopilotFromTranscript(workdir, 'session-advance');

      expect(nextState?.phase).toBe('planning');
      expect(getCurrentStage(nextState!)?.id).toBe('plan');
    });

    it('does not advance when signal is not in transcript', () => {
      initAutopilot(workdir, 'test request', 'session-no-advance');
      
      mkdirSync(join(claudeDir, 'sessions', 'session-no-advance'), { recursive: true });
      writeFileSync(
        join(claudeDir, 'sessions', 'session-no-advance', 'transcript.md'),
        'Work done but no signal',
        'utf-8'
      );

      const nextState = advanceAutopilotFromTranscript(workdir, 'session-no-advance');

      expect(nextState?.phase).toBe('expansion');
      expect(getCurrentStage(nextState!)?.id).toBe('analyst');
    });
  });

  describe('sync progress', () => {
    it('syncs progress and returns current state', () => {
      initAutopilot(workdir, 'test request', 'session-sync');
      
      const state = syncAutopilotProgress(workdir, 'session-sync');

      expect(state?.active).toBe(true);
      expect(state?.phase).toBe('expansion');
    });

    it('marks as failed when max iterations reached', () => {
      const state = initAutopilot(workdir, 'test request', 'session-max', {
        maxIterations: 2,
      });

      state.iteration = 3;
      writeAutopilotState(workdir, state);

      const result = syncAutopilotProgress(workdir, 'session-max');

      expect(result?.phase).toBe('failed');
      expect(result?.failureReason).toContain('max iterations');
    });
  });

  describe('failure handling', () => {
    it('marks autopilot as failed with reason', () => {
      initAutopilot(workdir, 'test request', 'session-fail');

      const state = markAutopilotFailed(workdir, 'Something went wrong');

      expect(state?.phase).toBe('failed');
      expect(state?.active).toBe(false);
      expect(state?.failureReason).toBe('Something went wrong');
      expect(state?.completedAt).not.toBeNull();

      const currentStage = getCurrentStage(state!);
      expect(currentStage?.status).toBe('failed');
      expect(currentStage?.notes).toBe('Something went wrong');
    });
  });

  describe('completion', () => {
    it('marks autopilot as complete', () => {
      initAutopilot(workdir, 'test request', 'session-complete');

      const state = completeAutopilot(workdir);

      expect(state?.phase).toBe('complete');
      expect(state?.active).toBe(false);
      expect(state?.completedAt).not.toBeNull();
    });
  });
});
