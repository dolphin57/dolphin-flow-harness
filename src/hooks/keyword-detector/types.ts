/**
 * Keyword Detector Types
 *
 * Type definitions for keyword detection system.
 */

export type KeywordType =
  | 'cancel'
  | 'ralph'
  | 'autopilot'
  | 'dfh-autopilot'
  | 'team'
  | 'ultrawork'
  | 'ralplan'
  | 'tdd'
  | 'code-review'
  | 'security-review'
  | 'ultrathink'
  | 'deepsearch'
  | 'analyze'
  | 'dfh-analyst'
  | 'dfh-refactor';

export interface DetectedKeyword {
  type: KeywordType;
  keyword: string;
  position: number;
}

export interface KeywordMatch {
  name: KeywordType;
  args: string;
}

export interface KeywordPattern {
  type: KeywordType;
  pattern: RegExp;
  priority: number;
  description: string;
}

export interface HookInput {
  prompt?: string;
  message?: {
    content?: string;
  };
  parts?: Array<{
    type: string;
    text?: string;
  }>;
  cwd?: string;
  directory?: string;
  session_id?: string;
  sessionId?: string;
}

export interface HookOutput {
  continue: boolean;
  suppressOutput?: boolean;
  hookSpecificOutput?: {
    hookEventName: string;
    additionalContext: string;
  };
}

export interface SkillInvocation {
  name: string;
  args?: string;
}
