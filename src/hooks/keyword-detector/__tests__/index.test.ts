/**
 * Keyword Detector Tests
 */

import { describe, it, expect } from 'vitest';
import {
  detectKeywords,
  detectKeywordsWithType,
  getAllKeywords,
  hasKeyword,
  getPrimaryKeyword,
  processHookInput
} from '../index.js';
import { sanitizeForKeywordDetection, extractPrompt, resolveConflicts } from '../utils.js';

describe('Keyword Detection', () => {
  describe('detectKeywords', () => {
    it('should detect dfh-analyst keyword', () => {
      const result = detectKeywords('dfh-analyst analyze user authentication');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('dfh-analyst');
    });

    it('should detect dfh analyst with space', () => {
      const result = detectKeywords('dfh analyst check the payment system');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('dfh-analyst');
    });

    it('should detect dolphin analyst', () => {
      const result = detectKeywords('dolphin analyst review the API design');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('dfh-analyst');
    });

    it('should detect requirements analysis', () => {
      const result = detectKeywords('requirements analysis for the new dashboard');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('dfh-analyst');
    });

    it('should detect analyze requirements', () => {
      const result = detectKeywords('analyze requirements for user registration');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('dfh-analyst');
    });

    it('should detect dfh-refactor', () => {
      const result = detectKeywords('dfh-refactor this code');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('dfh-refactor');
    });

    it('should detect ralph', () => {
      const result = detectKeywords('ralph don\'t stop until done');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('ralph');
    });

    it('should detect autopilot', () => {
      const result = detectKeywords('autopilot build me an app');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('autopilot');
    });

    it('should detect cancel', () => {
      const result = detectKeywords('cancelomc stop everything');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('cancel');
    });

    it('should detect multiple keywords', () => {
      const result = detectKeywords('ralph autopilot build me an app');
      expect(result.length).toBeGreaterThan(1);
    });

    it('should not detect keywords in regular text', () => {
      const result = detectKeywords('just a regular request without keywords');
      expect(result).toHaveLength(0);
    });
  });

  describe('detectKeywordsWithType', () => {
    it('should return keyword with position', () => {
      const result = detectKeywordsWithType('dfh-analyst analyze this');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('dfh-analyst');
      expect(result[0].keyword).toBe('dfh-analyst');
      expect(result[0].position).toBe(0);
    });
  });

  describe('getAllKeywords', () => {
    it('should resolve conflicts correctly', () => {
      const result = getAllKeywords('cancel autopilot ralph');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('cancel');
    });

    it('should sort by priority', () => {
      const result = getAllKeywords('autopilot ralph');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('ralph');
      expect(result[1].name).toBe('autopilot');
    });
  });

  describe('hasKeyword', () => {
    it('should return true when keyword exists', () => {
      expect(hasKeyword('dfh-analyst check this')).toBe(true);
    });

    it('should return false when no keyword exists', () => {
      expect(hasKeyword('just a regular request')).toBe(false);
    });
  });

  describe('getPrimaryKeyword', () => {
    it('should return highest priority keyword', () => {
      const result = getPrimaryKeyword('autopilot ralph build me an app');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('ralph');
    });

    it('should return null when no keywords', () => {
      const result = getPrimaryKeyword('just a regular request');
      expect(result).toBeNull();
    });
  });
});

describe('Utilities', () => {
  describe('sanitizeForKeywordDetection', () => {
    it('should remove code blocks', () => {
      const text = 'dfh-analyst ```code block``` analyze this';
      const result = sanitizeForKeywordDetection(text);
      expect(result).not.toContain('code block');
      expect(result).toContain('dfh-analyst');
    });

    it('should remove XML tags', () => {
      const text = 'dfh-analyst <tag>content</tag> analyze this';
      const result = sanitizeForKeywordDetection(text);
      expect(result).not.toContain('<tag>');
      expect(result).toContain('dfh-analyst');
    });

    it('should remove URLs', () => {
      const text = 'dfh-analyst https://example.com analyze this';
      const result = sanitizeForKeywordDetection(text);
      expect(result).not.toContain('https://example.com');
      expect(result).toContain('dfh-analyst');
    });
  });

  describe('extractPrompt', () => {
    it('should extract prompt from input', () => {
      const input = { prompt: 'test prompt' };
      const result = extractPrompt(input);
      expect(result).toBe('test prompt');
    });

    it('should extract from message content', () => {
      const input = { message: { content: 'test content' } };
      const result = extractPrompt(input);
      expect(result).toBe('test content');
    });

    it('should extract from parts', () => {
      const input = {
        parts: [
          { type: 'text', text: 'part1' },
          { type: 'other' },
          { type: 'text', text: 'part2' }
        ]
      };
      const result = extractPrompt(input);
      expect(result).toBe('part1 part2');
    });

    it('should return empty string for no prompt', () => {
      const input = {};
      const result = extractPrompt(input);
      expect(result).toBe('');
    });
  });

  describe('resolveConflicts', () => {
    it('should prioritize cancel', () => {
      const matches = [
        { name: 'autopilot' as const, args: '' },
        { name: 'cancel' as const, args: '' },
        { name: 'ralph' as const, args: '' }
      ];
      const result = resolveConflicts(matches);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('cancel');
    });

    it('should remove autopilot when team is present', () => {
      const matches = [
        { name: 'team' as const, args: '' },
        { name: 'autopilot' as const, args: '' }
      ];
      const result = resolveConflicts(matches);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('team');
    });
  });
});

describe('Hook Processing', () => {
  describe('processHookInput', () => {
    it('should return skill invocation for dfh-analyst', () => {
      const input = { prompt: 'dfh-analyst analyze this' };
      const result = processHookInput(input);
      expect(result.continue).toBe(true);
      expect(result.hookSpecificOutput?.additionalContext).toContain('dfh-analyst');
    });

    it('should suppress output for no keywords', () => {
      const input = { prompt: 'just a regular request' };
      const result = processHookInput(input);
      expect(result.continue).toBe(true);
      expect(result.suppressOutput).toBe(true);
    });

    it('should handle empty input', () => {
      const input = {};
      const result = processHookInput(input);
      expect(result.continue).toBe(true);
      expect(result.suppressOutput).toBe(true);
    });
  });
});
