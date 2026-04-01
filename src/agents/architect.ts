/**
 * Architect Agent
 *
 * Produces technical design and implementation boundaries.
 */

import type { AgentConfig, AgentPromptMetadata } from './types.js';
import { loadAgentPrompt } from './utils.js';

export const ARCHITECT_PROMPT_METADATA: AgentPromptMetadata = {
  category: 'advisor',
  cost: 'EXPENSIVE',
  promptAlias: 'architect',
  triggers: [
    {
      domain: 'Architecture',
      trigger: 'System design, interfaces, tradeoffs, technical constraints',
    },
  ],
  useWhen: [
    'When design choices affect multiple modules',
    'When introducing or changing boundaries/interfaces',
    'When a technical spec is needed',
  ],
  avoidWhen: [
    'For simple single-file changes',
    'When the architecture is already fixed and validated',
  ],
};

export const architectAgent: AgentConfig = {
  name: 'architect',
  description:
    'Architecture specialist for producing robust technical design, module boundaries, and tradeoff-aware implementation guidance.',
  prompt: loadAgentPrompt('architect'),
  model: 'opus',
  defaultModel: 'opus',
  metadata: ARCHITECT_PROMPT_METADATA,
};
