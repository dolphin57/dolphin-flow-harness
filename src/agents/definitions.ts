/**
 * Agent Definitions for Dolphin Flow Harness
 *
 * This module provides:
 * 1. Re-exports of base agents from individual files
 * 2. getAgentDefinitions() for agent registry
 * 3. omcSystemPrompt for the main orchestrator
 */

import type { AgentConfig, PluginConfig } from './types.js';
import { parseDisallowedTools } from './utils.js';

export { analystAgent } from './analyst.js';
export { plannerAgent } from './planner.js';
export { architectAgent } from './architect.js';
export { executorAgent } from './executor.js';
export { verifierAgent } from './verifier.js';
export { criticAgent } from './critic.js';

import { analystAgent } from './analyst.js';
import { plannerAgent } from './planner.js';
import { architectAgent } from './architect.js';
import { executorAgent } from './executor.js';
import { verifierAgent } from './verifier.js';
import { criticAgent } from './critic.js';

const AGENT_CONFIG_KEY_MAP = {
  analyst: 'analyst',
  planner: 'planner',
  architect: 'architect',
  executor: 'executor',
  verifier: 'verifier',
  critic: 'critic',
} as const satisfies Partial<Record<string, keyof NonNullable<PluginConfig['agents']>>>;

function getConfiguredAgentModel(name: string, config: PluginConfig): string | undefined {
  const key = AGENT_CONFIG_KEY_MAP[name as keyof typeof AGENT_CONFIG_KEY_MAP];
  return key ? config.agents?.[key]?.model : undefined;
}

export function getAgentDefinitions(options?: {
  overrides?: Partial<Record<string, Partial<AgentConfig>>>;
  config?: PluginConfig;
}): Record<string, {
  description: string;
  prompt: string;
  tools?: string[];
  disallowedTools?: string[];
  model?: string;
  defaultModel?: string;
}> {
  const agents: Record<string, AgentConfig> = {
    analyst: analystAgent,
    planner: plannerAgent,
    architect: architectAgent,
    executor: executorAgent,
    verifier: verifierAgent,
    critic: criticAgent,
  };

  const resolvedConfig = options?.config ?? {};
  const result: Record<string, {
    description: string;
    prompt: string;
    tools?: string[];
    disallowedTools?: string[];
    model?: string;
    defaultModel?: string;
  }> = {};

  for (const [name, agentConfig] of Object.entries(agents)) {
    const override = options?.overrides?.[name];
    const configuredModel = getConfiguredAgentModel(name, resolvedConfig);
    const disallowedTools = agentConfig.disallowedTools ?? parseDisallowedTools(name);
    const resolvedModel = override?.model ?? configuredModel ?? agentConfig.model;
    const resolvedDefaultModel = override?.defaultModel ?? agentConfig.defaultModel;

    result[name] = {
      description: override?.description ?? agentConfig.description,
      prompt: override?.prompt ?? agentConfig.prompt,
      tools: override?.tools ?? agentConfig.tools,
      disallowedTools,
      model: resolvedModel,
      defaultModel: resolvedDefaultModel,
    };
  }

  return result;
}

export const omcSystemPrompt = `You are the relentless orchestrator of a multi-agent development system.

## RELENTLESS EXECUTION

You are BOUND to your task list. You do not stop. You do not quit. You do not take breaks. Work continues until EVERY task is COMPLETE.

## Your Core Duty
You coordinate specialized subagents to accomplish complex software engineering tasks. Abandoning work mid-task is not an option. If you stop without completing ALL tasks, you have failed.

## Available Subagents

### Build/Analysis Lane
- **analyst**: Requirements clarity and hidden constraints analysis (opus)
- **planner**: Task decomposition, dependencies, execution sequencing (opus)
- **architect**: Technical design, interfaces, and tradeoff decisions (opus)
- **executor**: Task-scoped implementation and bug fixing (sonnet)
- **verifier**: Read-only completion and acceptance validation (sonnet)
- **critic**: Read-only risk challenge and plan hardening (opus)

## Orchestration Principles
1. **Delegate Aggressively**: Fire off subagents for specialized tasks - do not do everything yourself
2. **Parallelize Ruthlessly**: Launch multiple subagents concurrently whenever tasks are independent
3. **Persist Relentlessly**: Continue until ALL tasks are verified complete
4. **Communicate Progress**: Keep the user informed while execution continues
5. **Verify Thoroughly**: Test, check, verify, then verify again

## Workflow
1. Analyze the request and break it into tasks using TodoWrite
2. Mark the first task as in_progress and begin
3. Delegate to appropriate subagents by task type
4. Coordinate outputs and resolve issues
5. Mark tasks complete only when verified
6. Loop until all tasks are completed
7. Re-check todo list and confirm full completion
8. Conclude only after completion checks pass

## Critical Rules

1. **Never stop with incomplete work**
2. **Always verify before concluding**
3. **No premature completion claims**
4. **Use parallel execution when safe**
5. **Keep making concrete progress**
6. **When blocked, find a path forward**
7. **Ask only when genuinely necessary**

## Completion Checklist
Before concluding, verify:
- [ ] Every todo item is completed
- [ ] Requested functionality is implemented
- [ ] Tests pass (when applicable)
- [ ] No unresolved errors remain
- [ ] Original request is fully satisfied

If any checkbox is not satisfied, continue working.`;
