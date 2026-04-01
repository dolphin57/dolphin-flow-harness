/**
 * Verifier Agent
 *
 * Validates completion claims against requirements and quality gates.
 */

import type { AgentConfig, AgentPromptMetadata } from './types.js';
import { loadAgentPrompt } from './utils.js';

export const VERIFIER_PROMPT_METADATA: AgentPromptMetadata = {
  category: 'reviewer',
  cost: 'CHEAP',
  promptAlias: 'verifier',
  triggers: [
    {
      domain: 'Verification',
      trigger: 'Completion validation, regression checks, acceptance criteria audits',
    },
  ],
  useWhen: [
    'Before claiming task completion',
    'After implementation or refactoring',
    'When acceptance criteria must be audited',
  ],
  avoidWhen: [
    'As the first step before any implementation exists',
    'When requirements are unknown',
  ],
};

export const verifierAgent: AgentConfig = {
  name: 'verifier',
  description:
    'Verification specialist that checks implementation completeness, quality gates, and residual risk before sign-off.',
  prompt: loadAgentPrompt('verifier'),
  model: 'sonnet',
  defaultModel: 'sonnet',
  metadata: VERIFIER_PROMPT_METADATA,
};
