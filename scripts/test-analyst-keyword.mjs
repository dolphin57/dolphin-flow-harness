#!/usr/bin/env node

/**
 * Test script for dfh-analyst keyword detection
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const testCases = [
  {
    name: 'dfh-analyst keyword',
    prompt: 'dfh-analyst analyze user authentication feature',
    shouldMatch: true
  },
  {
    name: 'dfh analyst (space)',
    prompt: 'dfh analyst check the payment system requirements',
    shouldMatch: true
  },
  {
    name: 'dolphin analyst',
    prompt: 'dolphin analyst review the API design',
    shouldMatch: true
  },
  {
    name: 'requirements analysis',
    prompt: 'requirements analysis for the new dashboard',
    shouldMatch: true
  },
  {
    name: 'analyze requirements',
    prompt: 'analyze requirements for user registration flow',
    shouldMatch: true
  },
  {
    name: 'requirements gap',
    prompt: 'requirements gap analysis for the checkout process',
    shouldMatch: true
  },
  {
    name: 'scope validation',
    prompt: 'scope validation for the migration project',
    shouldMatch: true
  },
  {
    name: 'hidden requirements',
    prompt: 'find hidden requirements in the notification system',
    shouldMatch: true
  },
  {
    name: 'no keyword',
    prompt: 'just a regular request without keywords',
    shouldMatch: false
  }
];

async function runTest(testCase) {
  return new Promise((resolve) => {
    const input = JSON.stringify({
      prompt: testCase.prompt,
      cwd: process.cwd()
    });

    const child = spawn('node', [
      join(__dirname, 'keyword-detector.mjs')
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      try {
        const result = JSON.parse(stdout);
        const hasMatch = result.hookSpecificOutput?.additionalContext?.includes('dfh-analyst') || false;
        const passed = hasMatch === testCase.shouldMatch;

        console.log(`\n${passed ? '✅' : '❌'} ${testCase.name}`);
        console.log(`   Prompt: "${testCase.prompt}"`);
        console.log(`   Expected: ${testCase.shouldMatch ? 'match' : 'no match'}`);
        console.log(`   Result: ${hasMatch ? 'match' : 'no match'}`);

        if (!passed && stdout) {
          console.log(`   Output: ${stdout.substring(0, 200)}...`);
        }

        resolve(passed);
      } catch (error) {
        console.log(`\n❌ ${testCase.name} - Parse error`);
        console.log(`   Error: ${error.message}`);
        resolve(false);
      }
    });

    child.stdin.write(input);
    child.stdin.end();
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('Testing dfh-analyst keyword detection');
  console.log('='.repeat(60));

  let passed = 0;
  let total = testCases.length;

  for (const testCase of testCases) {
    const result = await runTest(testCase);
    if (result) passed++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Results: ${passed}/${total} tests passed`);
  console.log('='.repeat(60));

  process.exit(passed === total ? 0 : 1);
}

main();
