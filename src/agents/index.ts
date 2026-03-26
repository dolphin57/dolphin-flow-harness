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

export {
  getAgentDefinitions,
  omcSystemPrompt
} from './definitions.js';