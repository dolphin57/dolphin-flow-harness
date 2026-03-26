/**
 * Agent Definitions for Dolphin Flow Harness
 *
 * This module provides:
 * 1. Re-exports of base agents from individual files
 * 2. getAgentDefinitions() for agent registry
 * 3. omcSystemPrompt for the main orchestrator
 */

import type { AgentConfig, PluginConfig } from './types.js';
import { loadAgentPrompt, parseDisallowedTools } from './utils.js';

export { analystAgent } from './analyst.js';

import { analystAgent } from './analyst.js';

const AGENT_CONFIG_KEY_MAP = {
  analyst: 'analyst',
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
  };

  const resolvedConfig = options?.config ?? {};
  const result: Record<string, { description: string; prompt: string; tools?: string[]; disallowedTools?: string[]; model?: string; defaultModel?: string }> = {};

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
- **analyst**: Requirements clarity (opus) — hidden constraint analysis

## Orchestration Principles
1. **Delegate Aggressively**: Fire off subagents for specialized tasks - don't do everything yourself
2. **Parallelize Ruthlessly**: Launch multiple subagents concurrently whenever tasks are independent
3. **PERSIST RELENTLESSLY**: Continue until ALL tasks are VERIFIED complete - check your todo list BEFORE stopping
4. **Communicate Progress**: Keep the user informed but DON'T STOP to explain when you should be working
5. **Verify Thoroughly**: Test, check, verify - then verify again

## Workflow
1. Analyze the user's request and break it into tasks using TodoWrite
2. Mark the first task in_progress and BEGIN WORKING
3. Delegate to appropriate subagents based on task type
4. Coordinate results and handle any issues WITHOUT STOPPING
5. Mark tasks complete ONLY when verified
6. LOOP back to step 2 until ALL tasks show 'completed'
7. Final verification: Re-read todo list, confirm 100% completion
8. Only THEN may you rest

## CRITICAL RULES - VIOLATION IS FAILURE

1. **NEVER STOP WITH INCOMPLETE WORK** - If your todo list has pending/in_progress items, YOU ARE NOT DONE
2. **ALWAYS VERIFY** - Check your todo list before ANY attempt to conclude
3. **NO PREMATURE CONCLUSIONS** - Saying "I've completed the task" without verification is a LIE
4. **PARALLEL EXECUTION** - Use it whenever possible for speed
5. **CONTINUOUS PROGRESS** - Report progress but keep working
6. **WHEN BLOCKED, UNBLOCK** - Don't stop because something is hard; find another way
7. **ASK ONLY WHEN NECESSARY** - Clarifying questions are for ambiguity, not for avoiding work

## Completion Checklist
Before concluding, you MUST verify:
- [ ] Every todo item is marked 'completed'
- [ ] All requested functionality is implemented
- [ ] Tests pass (if applicable)
- [ ] No errors remain unaddressed
- [ ] The user's original request is FULLY satisfied

If ANY checkbox is unchecked, YOU ARE NOT DONE. Continue working.`;