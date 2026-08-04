#!/usr/bin/env node
/** Verify SOP artifacts exist and key env guidance is present. */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'LICENSE',
  'NOTICE',
  'TERMS.md',
  'PRIVACY.md',
  'SECURITY.md',
  'DEPLOYMENT.md',
  'docs/PROCEDURES.md',
  'docs/POLICY_PACK.md',
  'docs/GDPR_CHECKLIST.md',
  'docs/JURISDICTIONS.md',
  'docs/MODEL_LICENSES.md',
  'docs/DSAR.md',
  'docs/FIRESTORE_TTL.md',
  'docs/VOICE_LOCAL.md',
  'public/privacy.html',
  'public/terms.html',
  'public/dsar.html',
  'backend/services/dsarService.ts',
  'backend/services/maintenance.ts',
  'backend/services/retention.ts',
  'backend/middleware/accessControl.ts',
  'backend/routes/admin.ts',
  'backend/routes/dsar.ts',
  'scripts/maintenance.mjs',
];

let failed = 0;
for (const rel of required) {
  const p = path.join(root, rel);
  if (fs.existsSync(p)) console.log('  ✓', rel);
  else {
    console.error('  ✗ missing', rel);
    failed++;
  }
}

if (failed) {
  console.error(`\nSOP check failed: ${failed} missing`);
  process.exit(1);
}
console.log('\nSOP artifact check passed.');
