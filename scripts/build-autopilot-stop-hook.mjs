#!/usr/bin/env node

/**
 * Build script for the DFH autopilot stop hook.
 */

import { build } from 'esbuild';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

async function main() {
  await build({
    entryPoints: [join(rootDir, 'src/hooks/autopilot-stop-hook/index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    outfile: join(rootDir, 'scripts/autopilot-stop-hook.mjs'),
    banner: {
      js: '#!/usr/bin/env node'
    },
    minify: false,
    sourcemap: true,
  });
}

main().catch(error => {
  console.error('Failed to build autopilot-stop-hook:', error);
  process.exit(1);
});
