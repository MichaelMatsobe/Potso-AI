#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const tests = [
  'unit/jsonExtract.test.mjs',
  'unit/voiceLocal.test.mjs',
  'perf/latency.bench.mjs',
];

let failed = 0;
for (const t of tests) {
  console.log('\n>>>>>>>>', t);
  const r = spawnSync(process.execPath, [path.join(root, t)], {
    stdio: 'inherit',
    cwd: path.join(root, '..'),
  });
  if (r.status !== 0) failed++;
}

if (failed) {
  console.error(`\n${failed} suite(s) failed`);
  process.exit(1);
}
console.log('\nAll test suites passed.');
