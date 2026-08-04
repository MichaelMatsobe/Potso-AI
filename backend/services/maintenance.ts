/**
 * Automated maintenance: retention enforcement for on-disk DSAR data,
 * optional housekeeping. Firestore TTL remains GCP-side (expireAt field).
 */
import * as fs from 'fs';
import * as path from 'path';

export interface MaintenanceReport {
  ranAt: string;
  dsarExportsDeleted: number;
  dsarTicketsArchived: number;
  errors: string[];
  notes: string[];
}

function dsarRoot() {
  return path.join(process.cwd(), 'data', 'dsar');
}

function exportDir() {
  return path.join(dsarRoot(), 'exports');
}

function daysToMs(days: number) {
  return days * 24 * 60 * 60 * 1000;
}

export function getDsarExportRetentionDays(): number {
  return parseInt(process.env.RETENTION_DSAR_EXPORT_DAYS || '30', 10);
}

export function getDsarTicketRetentionDays(): number {
  return parseInt(process.env.RETENTION_DSAR_TICKET_DAYS || '730', 10); // ~24 months
}

/** Delete expired DSAR export JSON files */
export function purgeDsarExports(): { deleted: number; errors: string[] } {
  const dir = exportDir();
  const errors: string[] = [];
  let deleted = 0;
  if (!fs.existsSync(dir)) return { deleted: 0, errors };

  const maxAge = daysToMs(getDsarExportRetentionDays());
  const now = Date.now();

  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.json')) continue;
    const full = path.join(dir, name);
    try {
      const st = fs.statSync(full);
      if (now - st.mtimeMs > maxAge) {
        fs.unlinkSync(full);
        deleted++;
      }
    } catch (e) {
      errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { deleted, errors };
}

/**
 * Archive (delete) completed DSAR tickets older than retention.
 * Does not delete in-flight requests.
 */
export function purgeOldDsarTickets(): { archived: number; errors: string[] } {
  const root = dsarRoot();
  const errors: string[] = [];
  let archived = 0;
  if (!fs.existsSync(root)) return { archived: 0, errors };

  const maxAge = daysToMs(getDsarTicketRetentionDays());
  const now = Date.now();

  for (const name of fs.readdirSync(root)) {
    if (!name.startsWith('dsar_') || !name.endsWith('.json')) continue;
    const full = path.join(root, name);
    try {
      const raw = JSON.parse(fs.readFileSync(full, 'utf-8'));
      const completed = raw.completedAt || raw.updatedAt || raw.createdAt;
      const status = raw.status;
      if (!['completed', 'partial', 'rejected', 'failed'].includes(status)) continue;
      const t = new Date(completed).getTime();
      if (!Number.isFinite(t)) continue;
      if (now - t > maxAge) {
        fs.unlinkSync(full);
        archived++;
        // paired export
        const exp = path.join(exportDir(), name);
        if (fs.existsSync(exp)) fs.unlinkSync(exp);
      }
    } catch (e) {
      errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { archived, errors };
}

export async function runMaintenance(): Promise<MaintenanceReport> {
  const notes: string[] = [];
  const errors: string[] = [];

  const exports = purgeDsarExports();
  const tickets = purgeOldDsarTickets();
  errors.push(...exports.errors, ...tickets.errors);

  notes.push(
    `DSAR export retention: ${getDsarExportRetentionDays()} days`,
    `DSAR ticket retention: ${getDsarTicketRetentionDays()} days`,
    'Firestore document TTL is enforced by GCP when expireAt policy is Active (see docs/FIRESTORE_TTL.md).'
  );

  return {
    ranAt: new Date().toISOString(),
    dsarExportsDeleted: exports.deleted,
    dsarTicketsArchived: tickets.archived,
    errors,
    notes,
  };
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;

/** Start periodic maintenance when RETENTION_AUTO_PURGE=true */
export function startMaintenanceScheduler() {
  if (process.env.RETENTION_AUTO_PURGE !== 'true') return;
  const hours = parseInt(process.env.RETENTION_PURGE_INTERVAL_HOURS || '24', 10);
  const ms = Math.max(1, hours) * 60 * 60 * 1000;

  const tick = () => {
    runMaintenance()
      .then((r) => {
        console.log(
          `[maintenance] exports=${r.dsarExportsDeleted} tickets=${r.dsarTicketsArchived} errors=${r.errors.length}`
        );
      })
      .catch((e) => console.warn('[maintenance] failed', e));
  };

  tick();
  intervalHandle = setInterval(tick, ms);
  console.log(`[maintenance] auto-purge every ${hours}h`);
}

export function stopMaintenanceScheduler() {
  if (intervalHandle) clearInterval(intervalHandle);
  intervalHandle = null;
}
