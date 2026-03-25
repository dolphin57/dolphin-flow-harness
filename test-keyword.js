#!/usr/bin/env node
/**
 * Test script for dfh-refactor keyword detection
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

const testCases = [
  { input: 'Please dfh-refactor this file', expected: 'dfh-refactor' },
  { input: 'Use dfh refactor to improve the code', expected: 'dfh-refactor' },
  { input: 'Just help me write code', expected: null }
];

async function runKeywordDetector(input) {
  return new Promise((resolve) => {
    const detectorPath = join(process.cwd(), 'scripts', 'keyword-detector.mjs');
    const nodePath = process.execPath;

    const proc = spawn(nodePath, [detectorPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const testData = JSON.stringify({
      prompt: input,
      cwd: process.cwd(),
      session_id: 'test-session-123'
    });

    let output = '';
    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    setTimeout(() => {
      try {
        const result = JSON.parse(output);
        resolve(result);
      } catch {
        resolve(null);
      }
      proc.kill();
    }, 1000);

    proc.stdin.write(testData);
    proc.stdin.end();
  });
}

async function main() {
  console.log('Testing dfh-refactor keyword detection...\n');

  for (const test of testCases) {
    console.log(`Input: "${test.input}"`);
    const result = await runKeywordDetector(test.input);

    if (result && result.hookSpecificOutput?.additionalContext) {
      const context = result.hookSpecificOutput.additionalContext;
      const containsKeyword = context.includes('DFH-REFACTOR') || context.includes('dfh-refactor');
      const passed = containsKeyword === !!test.expected;

      console.log(`  Result: ${passed ? '✓ PASSED' : '✗ FAILED'}`);
      if (containsKeyword) {
        console.log(`  Detected: dfh-refactor`);
      }
    } else {
      const passed = test.expected === null;
      console.log(`  Result: ${passed ? '✓ PASSED (no keyword)' : '✗ FAILED'}`);
    }
    console.log('');
  }

  console.log('Test complete!');
}

main().catch(console.error);
