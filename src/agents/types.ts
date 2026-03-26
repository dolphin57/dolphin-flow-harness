/**
 * Agent Types for Dolphin Flow Harness
 *
 * Defines types for agent configuration and metadata used in dynamic prompt generation.
 */

export type ModelType = "sonnet" | "opus" | "haiku" | "inherit";

export type AgentCost = 'FREE' | 'CHEAP' | 'EXPENSIVE';

export type AgentCategory =
  | 'exploration'
  | 'specialist'
  | 'advisor'
  | 'utility'
  | 'orchestration'
  | 'planner'
  | 'reviewer';

export interface DelegationTrigger {
  domain: string;
  trigger: string;
}

export interface AgentPromptMetadata {
  category: AgentCategory;
  cost: AgentCost;
  promptAlias?: string;
  triggers: DelegationTrigger[];
  useWhen?: string[];
  avoidWhen?: string[];
  promptDescription?: string;
  tools?: string[];
}

export interface AgentConfig {
  name: string;
  description: string;
  prompt: string;
  tools?: string[];
  disallowedTools?: string[];
  model?: string;
  defaultModel?: string;
  metadata?: AgentPromptMetadata;
}

export interface FullAgentConfig extends AgentConfig {
  temperature?: number;
  maxTokens?: number;
  thinking?: {
    type: 'enabled' | 'disabled';
    budgetTokens?: number;
  };
  toolRestrictions?: string[];
}

export interface AgentOverrideConfig {
  model?: string;
  enabled?: boolean;
  prompt_append?: string;
  temperature?: number;
}

export type AgentOverrides = Partial<Record<string, AgentOverrideConfig>>;

export type AgentFactory = (model?: string) => AgentConfig;

export interface AvailableAgent {
  name: string;
  description: string;
  metadata: AgentPromptMetadata;
}

export function isGptModel(modelId: string): boolean {
  return modelId.toLowerCase().includes('gpt');
}

export function isClaudeModel(modelId: string): boolean {
  return modelId.toLowerCase().includes('claude');
}

export function getDefaultModelForCategory(category: AgentCategory): ModelType {
  switch (category) {
    case 'exploration':
      return 'haiku';
    case 'specialist':
      return 'sonnet';
    case 'advisor':
      return 'opus';
    case 'utility':
      return 'haiku';
    case 'orchestration':
      return 'sonnet';
    default:
      return 'sonnet';
  }
}

export interface PluginConfig {
  agents?: {
    dfh?: { model?: string };
    explore?: { model?: string };
    analyst?: { model?: string };
    planner?: { model?: string };
    architect?: { model?: string };
    debugger?: { model?: string };
    executor?: { model?: string };
    verifier?: { model?: string };
    securityReviewer?: { model?: string };
    codeReviewer?: { model?: string };
    testEngineer?: { model?: string };
    designer?: { model?: string };
    writer?: { model?: string };
    qaTester?: { model?: string };
    scientist?: { model?: string };
    tracer?: { model?: string };
    gitMaster?: { model?: string };
    codeSimplifier?: { model?: string };
    critic?: { model?: string };
    documentSpecialist?: { model?: string };
  };
}