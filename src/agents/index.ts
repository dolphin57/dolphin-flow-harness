/**
 * Agents Module Exports for Dolphin Flow Harness
 *
 * New modular agent system with individual files and metadata.
 */

export * from './types.js';

export {
  createAgentToolRestrictions,
  mergeAgentConfig,
  buildDelegationTable,
  buildUseAvoidSection,
  createEnvContext,
  getAvailableAgents,
  buildKeyTriggersSection,
  validateAgentConfig,
  deepMerge,
  loadAgentPrompt,
  formatOpenQuestions,
  OPEN_QUESTIONS_PATH
} from './utils.js';

export { analystAgent, ANALYST_PROMPT_METADATA } from './analyst.js';
export { plannerAgent, PLANNER_PROMPT_METADATA } from './planner.js';
export { architectAgent, ARCHITECT_PROMPT_METADATA } from './architect.js';
export { executorAgent, EXECUTOR_PROMPT_METADATA } from './executor.js';
export { verifierAgent, VERIFIER_PROMPT_METADATA } from './verifier.js';
export { criticAgent, CRITIC_PROMPT_METADATA } from './critic.js';

export {
  getAgentDefinitions,
  omcSystemPrompt
} from './definitions.js';
