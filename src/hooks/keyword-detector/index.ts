/**
 * Keyword Detector - Main Entry Point
 *
 * Core logic for detecting keywords in user prompts.
 */

import type { KeywordMatch, HookInput, HookOutput, DetectedKeyword } from './types.js';
import { KEYWORD_PATTERNS, KEYWORD_PRIORITY } from './patterns.js';
import {
  extractPrompt,
  sanitizeForKeywordDetection,
  resolveConflicts,
  createMultiSkillInvocation,
  createHookOutput
} from './utils.js';

export * from './types.js';
export * from './patterns.js';
export * from './utils.js';

export function detectKeywords(text: string): KeywordMatch[] {
  const matches: KeywordMatch[] = [];
  const cleanText = sanitizeForKeywordDetection(text).toLowerCase();

  for (const pattern of KEYWORD_PATTERNS) {
    const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
    const match = cleanText.match(regex);

    if (match) {
      matches.push({
        name: pattern.type,
        args: ''
      });
    }
  }

  return matches;
}

export function detectKeywordsWithType(text: string): DetectedKeyword[] {
  const detected: DetectedKeyword[] = [];
  const cleanText = sanitizeForKeywordDetection(text);

  for (const pattern of KEYWORD_PATTERNS) {
    const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
    const match = cleanText.match(regex);

    if (match && match.index !== undefined) {
      detected.push({
        type: pattern.type,
        keyword: match[0],
        position: match.index
      });
    }
  }

  return detected;
}

export function getAllKeywords(text: string): KeywordMatch[] {
  const detected = detectKeywords(text);

  if (detected.length === 0) return [];

  const uniqueNames = [...new Set(detected.map(d => d.name))];
  let matches = uniqueNames.map(name => ({
    name,
    args: ''
  }));

  matches = resolveConflicts(matches);

  matches.sort((a, b) => {
    const priorityA = KEYWORD_PRIORITY.indexOf(a.name);
    const priorityB = KEYWORD_PRIORITY.indexOf(b.name);
    return priorityA - priorityB;
  });

  return matches;
}

export function hasKeyword(text: string): boolean {
  return detectKeywords(text).length > 0;
}

export function getPrimaryKeyword(text: string): DetectedKeyword | null {
  const allKeywords = getAllKeywords(text);

  if (allKeywords.length === 0) {
    return null;
  }

  const primaryType = allKeywords[0].name;
  const detected = detectKeywordsWithType(text);
  const match = detected.find(d => d.type === primaryType);

  return match || null;
}

export function processHookInput(input: HookInput): HookOutput {
  const prompt = extractPrompt(input);

  if (!prompt || !prompt.trim()) {
    return {
      continue: true,
      suppressOutput: true
    };
  }

  const keywords = getAllKeywords(prompt);

  if (keywords.length === 0) {
    return {
      continue: true,
      suppressOutput: true
    };
  }

  const skillMessage = createMultiSkillInvocation(keywords, prompt);
  return createHookOutput(skillMessage);
}

export async function main(): Promise<void> {
  const skipHooks = (process.env.OMC_SKIP_HOOKS || '').split(',').map(s => s.trim());
  if (process.env.DISABLE_OMC === '1' || skipHooks.includes('keyword-detector')) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  try {
    const input = await readStdin();
    if (!input.trim()) {
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
      return;
    }

    let data: HookInput = {};
    try {
      data = JSON.parse(input);
    } catch {
    }

    const output = processHookInput(data);
    console.log(JSON.stringify(output));
  } catch (error) {
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString('utf-8');
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('keyword-detector.mjs')) {
  main();
}
