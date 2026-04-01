/**
 * Keyword Detector Utilities
 *
 * Utility functions for keyword detection.
 */

import type { HookInput, HookOutput, KeywordMatch } from './types.js';

const KEYWORD_TO_SKILL_MAP: Partial<Record<KeywordMatch['name'], string>> = {
  autopilot: 'dfh-autopilot',
  'dfh-autopilot': 'dfh-autopilot',
  'dfh-analyst': 'dfh-analyst',
  'dfh-refactor': 'dfh-refactor',
};

function resolveSkillName(skillName: KeywordMatch['name']): string {
  return KEYWORD_TO_SKILL_MAP[skillName] ?? skillName;
}

export function extractPrompt(input: HookInput): string {
  if (input.prompt) return input.prompt;
  if (input.message?.content) return input.message.content;
  if (Array.isArray(input.parts)) {
    return input.parts
      .filter(p => p.type === 'text')
      .map(p => p.text)
      .join(' ');
  }
  return '';
}

export function sanitizeForKeywordDetection(text: string): string {
  return text
    .replace(/<(\w[\w-]*)[\s>][\s\S]*?<\/\1>/g, '')
    .replace(/<\w[\w-]*(?:\s[^>]*)?\s*\/>/g, '')
    .replace(/https?:\/\/[^\s)>\]]+/g, '')
    .replace(/(?<=^|[\s"'`(])(?:\/)?(?:[\w.-]+\/)+[\w.-]+/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '');
}

export function resolveConflicts(matches: KeywordMatch[]): KeywordMatch[] {
  const names = matches.map(m => m.name);

  if (names.includes('cancel')) {
    return [matches.find(m => m.name === 'cancel')!];
  }

  let resolved = [...matches];

  if (names.includes('team') && names.includes('autopilot')) {
    resolved = resolved.filter(m => m.name !== 'autopilot');
  }

  return resolved;
}

export function createSkillInvocation(
  skillName: string,
  originalPrompt: string,
  args = ''
): string {
  const resolvedSkillName = resolveSkillName(skillName as KeywordMatch['name']);
  const argsSection = args ? `\nArguments: ${args}` : '';
  return `[MAGIC KEYWORD: ${skillName.toUpperCase()}]

You MUST invoke the skill using the Skill tool:

Skill: dolphin-flow-harness:${resolvedSkillName}${argsSection}

User request:
${originalPrompt}

IMPORTANT: Invoke the skill IMMEDIATELY. Do not proceed without loading the skill instructions.`;
}

export function createMultiSkillInvocation(
  skills: KeywordMatch[],
  originalPrompt: string
): string {
  if (skills.length === 0) return '';
  if (skills.length === 1) {
    return createSkillInvocation(skills[0].name, originalPrompt, skills[0].args);
  }

  const skillBlocks = skills
    .map(
      (s, i) => {
        const resolvedSkillName = resolveSkillName(s.name);
        const argsSection = s.args ? `\nArguments: ${s.args}` : '';
        return `### Skill ${i + 1}: ${s.name.toUpperCase()}
Skill: dolphin-flow-harness:${resolvedSkillName}${argsSection}`;
      }
    )
    .join('\n\n');

  return `[MAGIC KEYWORDS DETECTED: ${skills.map(s => s.name.toUpperCase()).join(', ')}]

You MUST invoke ALL of the following skills using the Skill tool, in order:

${skillBlocks}

User request:
${originalPrompt}

IMPORTANT: Invoke ALL skills listed above. Start with the first skill IMMEDIATELY. After it completes, invoke the next skill in order. Do not skip any skill.`;
}

export function createHookOutput(additionalContext: string): HookOutput {
  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext
    }
  };
}

export function extractDirectory(input: HookInput): string {
  if (input.cwd) {
    return input.cwd;
  }

  if (input.directory) {
    return input.directory;
  }

  try {
    if (typeof __dirname !== 'undefined' && __dirname) {
      return __dirname;
    }
  } catch {
  }

  return process.cwd();
}
