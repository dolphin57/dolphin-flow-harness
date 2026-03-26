/**
 * Keyword Patterns
 *
 * Defines all keyword patterns for detection.
 */

import type { KeywordPattern, KeywordType } from './types.js';

export const KEYWORD_PATTERNS: KeywordPattern[] = [
  {
    type: 'cancel',
    pattern: /\b(cancelomc|stopomc)\b/i,
    priority: 1,
    description: 'Stop active modes'
  },
  {
    type: 'ralph',
    pattern: /\b(ralph|don't stop|must complete|until done)\b/i,
    priority: 2,
    description: 'Persistence mode until task completion'
  },
  {
    type: 'autopilot',
    pattern: /\b(autopilot|auto pilot|auto-pilot|autonomous|full auto|fullsend)\b/i,
    priority: 3,
    description: 'Full autonomous execution'
  },
  {
    type: 'team',
    pattern: /(?<!\b(?:my|the|our|a|his|her|their|its)\s)\bteam\b/i,
    priority: 4,
    description: 'Coordinated team execution'
  },
  {
    type: 'ultrawork',
    pattern: /\b(ultrawork|ulw|uw)\b/i,
    priority: 5,
    description: 'Maximum parallel execution'
  },
  {
    type: 'ralplan',
    pattern: /\b(ralplan)\b/i,
    priority: 6,
    description: 'Iterative planning with consensus'
  },
  {
    type: 'tdd',
    pattern: /\b(tdd)\b/i,
    priority: 7,
    description: 'Test-driven development'
  },
  {
    type: 'ultrathink',
    pattern: /\b(ultrathink|think hard|think deeply)\b/i,
    priority: 8,
    description: 'Extended reasoning'
  },
  {
    type: 'deepsearch',
    pattern: /\b(deepsearch)\b/i,
    priority: 9,
    description: 'Codebase search'
  },
  {
    type: 'analyze',
    pattern: /\b(deep\s*analyze)\b/i,
    priority: 10,
    description: 'Analysis mode'
  },
  {
    type: 'dfh-analyst',
    pattern: /\b(dfh-analyst|dfh analyst|dolphin analyst|requirements analysis|analyze requirements|requirements gap|requirements review|requirements check|scope validation|scope analysis|scope check|hidden requirements|hidden assumptions|hidden constraints)\b/i,
    priority: 11,
    description: 'Requirements analysis and gap detection'
  },
  {
    type: 'dfh-refactor',
    pattern: /\b(dfh-refactor|dfh refactor)\b/i,
    priority: 12,
    description: 'Code refactoring'
  }
];

export const KEYWORD_PRIORITY: KeywordType[] = [
  'cancel',
  'ralph',
  'autopilot',
  'team',
  'ultrawork',
  'ralplan',
  'tdd',
  'ultrathink',
  'deepsearch',
  'analyze',
  'dfh-analyst',
  'dfh-refactor'
];

export function getPatternByType(type: KeywordType): KeywordPattern | undefined {
  return KEYWORD_PATTERNS.find(p => p.type === type);
}

export function getPatternPriority(type: KeywordType): number {
  const pattern = getPatternByType(type);
  return pattern?.priority ?? 999;
}
