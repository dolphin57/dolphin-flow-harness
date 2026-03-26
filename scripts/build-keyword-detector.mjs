#!/usr/bin/env node

/**
 * Build script for keyword-detector
 * 
 * Compiles TypeScript to JavaScript and bundles for production.
 */

import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

async function buildKeywordDetector() {
  console.log('Building keyword-detector...');

  // Build TypeScript with esbuild
  await build({
    entryPoints: [join(rootDir, 'src/hooks/keyword-detector/index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    outfile: join(rootDir, 'scripts/keyword-detector.mjs'),
    banner: {
      js: '#!/usr/bin/env node'
    },
    external: [],
    minify: false,
    sourcemap: true,
  });

  console.log('✅ keyword-detector built successfully');
}

async function main() {
  try {
    await buildKeywordDetector();
    console.log('\n🎉 Build complete!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

main();
