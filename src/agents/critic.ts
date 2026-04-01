/**
 * Critic Agent
 *
 * Challenges plans and decisions to expose hidden risks and weak assumptions.
 */

import type { AgentConfig, AgentPromptMetadata } from './types.js';
import { loadAgentPrompt } from './utils.js';

export const CRITIC_PROMPT_METADATA: AgentPromptMetadata = {
  category: 'reviewer',
  cost: 'EXPENSIVE',
  promptAlias: 'critic',
  triggers: [
    {
      domain: 'Critical Review',
      trigger: 'Plan weaknesses, assumption checks, risk-focused challenge',
    },
  ],
  useWhen: [
    'After planner/architect produce a plan',
    'Before locking implementation scope',
    'When tradeoffs are high-impact or uncertain',
  ],
  avoidWhen: [
    'For trivial low-risk tasks',
    'When no plan or proposal exists to critique',
  ],
};

export const criticAgent: AgentConfig = {
  name: 'critic',
  description:
    'Critical reviewer that stress-tests plans and technical decisions, surfacing hidden risks and concrete corrections.',
  prompt: loadAgentPrompt('critic'),
  model: 'opus',
  defaultModel: 'opus',
  metadata: CRITIC_PROMPT_METADATA,
};
