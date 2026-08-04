import { Router } from 'express';
import { runMaintenance } from '../services/maintenance.js';
import { getRetentionDays, TTL_FIELD } from '../services/retention.js';
import { isFirebaseReady } from '../config/firebase.js';

const router = Router();

function requireAdmin(req: any, res: any): boolean {
  const key = process.env.API_ACCESS_KEY;
  if (!key) {
    res.status(503).json({
      error: 'Set API_ACCESS_KEY to enable admin endpoints',
    });
    return false;
  }
  const provided =
    req.headers['x-api-key'] ||
    (typeof req.headers.authorization === 'string' &&
    req.headers.authorization.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : '');
  if (provided !== key) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

/** POST /api/admin/maintenance — run retention purges now */
router.post('/maintenance', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const report = await runMaintenance();
    res.json({ ok: true, report });
  } catch (e) {
    res.status(500).json({
      error: e instanceof Error ? e.message : String(e),
    });
  }
});

/** GET /api/admin/policy-status — operational policy snapshot */
router.get('/policy-status', (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json({
    accessControl: {
      apiKeyRequired: Boolean(process.env.API_ACCESS_KEY),
      rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '60', 10),
      rateLimitDisabled: process.env.RATE_LIMIT_DISABLED === 'true',
    },
    retention: {
      chatDays: getRetentionDays('chat'),
      messageDays: getRetentionDays('message'),
      dsarExportDays: parseInt(process.env.RETENTION_DSAR_EXPORT_DAYS || '30', 10),
      dsarTicketDays: parseInt(process.env.RETENTION_DSAR_TICKET_DAYS || '730', 10),
      firestoreTtlField: TTL_FIELD,
      autoPurge: process.env.RETENTION_AUTO_PURGE === 'true',
      firestoreConfigured: isFirebaseReady(),
    },
    dsar: { enabled: true },
    documents: {
      procedures: 'docs/PROCEDURES.md',
      policyPack: 'docs/POLICY_PACK.md',
      gdpr: 'docs/GDPR_CHECKLIST.md',
      jurisdictions: 'docs/JURISDICTIONS.md',
      modelLicenses: 'docs/MODEL_LICENSES.md',
      firestoreTtl: 'docs/FIRESTORE_TTL.md',
      dsar: 'docs/DSAR.md',
    },
  });
});

export default router;
