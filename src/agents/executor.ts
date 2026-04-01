/**
 * Executor Agent
 *
 * Implements planned tasks with production-focused code changes.
 */

import type { AgentConfig, AgentPromptMetadata } from './types.js';
import { loadAgentPrompt } from './utils.js';

export const EXECUTOR_PROMPT_METADATA: AgentPromptMetadata = {
  category: 'specialist',
  cost: 'CHEAP',
  promptAlias: 'executor',
  triggers: [
    {
      domain: 'Implementation',
      trigger: 'Code changes, feature implementation, bug fixes',
    },
  ],
  useWhen: [
    'During execution phase',
    'When tasks are ready with acceptance criteria',
    'When concrete code edits are required',
  ],
  avoidWhen: [
    'When requirements or plan are still undefined',
    'For high-level architectural decision making only',
  ],
};

export const executorAgent: AgentConfig = {
  name: 'executor',
  description:
    'Implementation specialist focused on delivering task-scoped code changes that satisfy acceptance criteria.',
  prompt: loadAgentPrompt('executor'),
  model: 'sonnet',
  defaultModel: 'sonnet',
  metadata: EXECUTOR_PROMPT_METADATA,
};
