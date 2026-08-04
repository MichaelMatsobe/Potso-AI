#!/usr/bin/env node
/** CLI: node scripts/maintenance.mjs */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dsarRoot = path.join(root, 'data', 'dsar');
const exportDir = path.join(dsarRoot, 'exports');

function days(envKey, fallback) {
  return parseInt(process.env[envKey] || String(fallback), 10);
}

function purgeExports() {
  let deleted = 0;
  if (!fs.existsSync(exportDir)) return 0;
  const maxAge = days('RETENTION_DSAR_EXPORT_DAYS', 30) * 864e5;
  const now = Date.now();
  for (const name of fs.readdirSync(exportDir)) {
    if (!name.endsWith('.json')) continue;
    const full = path.join(exportDir, name);
    const st = fs.statSync(full);
    if (now - st.mtimeMs > maxAge) {
      fs.unlinkSync(full);
      deleted++;
    }
  }
  return deleted;
}

function purgeTickets() {
  let archived = 0;
  if (!fs.existsSync(dsarRoot)) return 0;
  const maxAge = days('RETENTION_DSAR_TICKET_DAYS', 730) * 864e5;
  const now = Date.now();
  for (const name of fs.readdirSync(dsarRoot)) {
    if (!name.startsWith('dsar_') || !name.endsWith('.json')) continue;
    const full = path.join(dsarRoot, name);
    const raw = JSON.parse(fs.readFileSync(full, 'utf-8'));
    if (!['completed', 'partial', 'rejected', 'failed'].includes(raw.status)) continue;
    const t = new Date(raw.completedAt || raw.updatedAt || raw.createdAt).getTime();
    if (now - t > maxAge) {
      fs.unlinkSync(full);
      archived++;
    }
  }
  return archived;
}

const exportsDeleted = purgeExports();
const ticketsArchived = purgeTickets();
console.log(
  JSON.stringify(
    {
      ranAt: new Date().toISOString(),
      dsarExportsDeleted: exportsDeleted,
      dsarTicketsArchived: ticketsArchived,
    },
    null,
    2
  )
);
