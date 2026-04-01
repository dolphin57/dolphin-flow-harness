import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { processSkillInjection } from '../index.js';
import { readAutopilotState } from '../../autopilot/index.js';

describe('DFH skill injector', () => {
  let workdir: string;

  beforeEach(() => {
    workdir = mkdtempSync(join(tmpdir(), 'dfh-skill-injector-'));
  });

  afterEach(() => {
    rmSync(workdir, { recursive: true, force: true });
  });

  it('starts autopilot when the user invokes autopilot', () => {
    const result = processSkillInjection({
      prompt: 'autopilot: build a project automation pipeline',
      cwd: workdir,
      sessionId: 'session-start',
    });

    expect(result.hookSpecificOutput?.additionalContext).toContain('DFH AUTOPILOT STARTED');
    expect(readAutopilotState(workdir)?.active).toBe(true);
  });

  it('suppresses output for regular prompts', () => {
    const result = processSkillInjection({
      prompt: 'please explain the code',
      cwd: workdir,
    });

    expect(result.suppressOutput).toBe(true);
  });

  it('cancels an active autopilot run', () => {
    processSkillInjection({
      prompt: 'autopilot build a project automation pipeline',
      cwd: workdir,
      sessionId: 'session-cancel',
    });

    const result = processSkillInjection({
      prompt: 'cancelomc',
      cwd: workdir,
      sessionId: 'session-cancel',
    });

    expect(result.hookSpecificOutput?.additionalContext).toContain('DFH AUTOPILOT CANCELLED');
    expect(readAutopilotState(workdir)).toBeNull();
  });
});
