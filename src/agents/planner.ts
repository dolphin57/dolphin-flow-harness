/**
 * Planner Agent
 *
 * Converts clarified requirements into an executable implementation plan.
 */

import type { AgentConfig, AgentPromptMetadata } from './types.js';
import { loadAgentPrompt } from './utils.js';

export const PLANNER_PROMPT_METADATA: AgentPromptMetadata = {
  category: 'planner',
  cost: 'EXPENSIVE',
  promptAlias: 'planner',
  triggers: [
    {
      domain: 'Planning',
      trigger: 'Task decomposition, dependencies, execution sequencing',
    },
  ],
  useWhen: [
    'After requirements are clarified',
    'Before implementation starts',
    'When execution order is ambiguous',
    'When parallelizable work must be identified',
  ],
  avoidWhen: [
    'When implementation is already in progress and stable',
    'When requirements are still unclear',
  ],
};

export const plannerAgent: AgentConfig = {
  name: 'planner',
  description:
    'Planning specialist that turns scoped requirements into atomic tasks, dependencies, and acceptance criteria.',
  prompt: loadAgentPrompt('planner'),
  model: 'opus',
  defaultModel: 'opus',
  metadata: PLANNER_PROMPT_METADATA,
};
