import { Router } from 'express';
import {
  createDsarRequest,
  getDsar,
  processDsar,
  readExport,
  verifyDsarToken,
  listDsar,
  type DsarType,
} from '../services/dsarService.js';
import { audit } from '../services/auditLog.js';

const router = Router();

router.post('/request', async (req, res) => {
  try {
    const { type, email, userId, notes, rectificationPayload } = req.body || {};
    const { request, token } = await createDsarRequest({
      type: type as DsarType,
      email,
      userId,
      notes,
      rectificationPayload,
    });

    audit('dsar.request', {
      id: request.id,
      type: request.type,
      status: request.status,
      emailDomain: String(email || '').split('@')[1] || null,
    });

    res.status(201).json({
      id: request.id,
      type: request.type,
      status: request.status,
      token,
      tokenWarning: 'Store this token; it is required to check status or download export.',
      createdAt: request.createdAt,
      completedAt: request.completedAt,
      resultSummary: request.resultSummary,
      autoProcessed: request.autoProcessed,
      slaNote: 'Target response within 30 days under GDPR; many requests complete automatically.',
    });
  } catch (e) {
    res.status(400).json({
      error: e instanceof Error ? e.message : String(e),
    });
  }
});

router.get('/:id', (req, res) => {
  const dsar = getDsar(req.params.id);
  if (!dsar) return res.status(404).json({ error: 'Not found' });

  const token = String(req.query.token || req.headers['x-dsar-token'] || '');
  const adminKey = process.env.API_ACCESS_KEY;
  const adminOk =
    adminKey &&
    (req.headers['x-api-key'] === adminKey ||
      (typeof req.headers.authorization === 'string' &&
        req.headers.authorization === `Bearer ${adminKey}`));

  if (!adminOk && !verifyDsarToken(dsar, token)) {
    return res.status(401).json({ error: 'Invalid or missing DSAR token' });
  }

  res.json({
    id: dsar.id,
    type: dsar.type,
    status: dsar.status,
    email: dsar.email,
    createdAt: dsar.createdAt,
    updatedAt: dsar.updatedAt,
    completedAt: dsar.completedAt,
    resultSummary: dsar.resultSummary,
    autoProcessed: dsar.autoProcessed,
    exportAvailable: Boolean(dsar.exportPath),
    steps: dsar.steps,
  });
});

router.get('/:id/export', (req, res) => {
  const dsar = getDsar(req.params.id);
  if (!dsar) return res.status(404).json({ error: 'Not found' });

  const token = String(req.query.token || req.headers['x-dsar-token'] || '');
  if (!verifyDsarToken(dsar, token)) {
    return res.status(401).json({ error: 'Invalid or missing DSAR token' });
  }

  if (dsar.type !== 'access' && dsar.type !== 'portability') {
    return res.status(400).json({ error: 'Export only available for access/portability requests' });
  }

  const body = readExport(dsar.id);
  if (!body) return res.status(404).json({ error: 'Export not ready' });

  audit('dsar.export', { id: dsar.id });

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${dsar.id}-export.json"`);
  res.send(body);
});

router.post('/:id/process', async (req, res) => {
  const dsar = getDsar(req.params.id);
  if (!dsar) return res.status(404).json({ error: 'Not found' });

  const token = String(req.body?.token || req.headers['x-dsar-token'] || '');
  const adminKey = process.env.API_ACCESS_KEY;
  const adminOk =
    adminKey &&
    (req.headers['x-api-key'] === adminKey ||
      (typeof req.headers.authorization === 'string' &&
        req.headers.authorization === `Bearer ${adminKey}`));

  if (!adminOk && !verifyDsarToken(dsar, token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const updated = await processDsar(req.params.id, { auto: false });
  audit('dsar.process', { id: updated?.id, status: updated?.status });
  res.json({
    id: updated?.id,
    status: updated?.status,
    resultSummary: updated?.resultSummary,
    exportAvailable: Boolean(updated?.exportPath),
  });
});

router.get('/', (req, res) => {
  const adminKey = process.env.API_ACCESS_KEY;
  if (!adminKey) {
    return res.status(503).json({ error: 'Set API_ACCESS_KEY to enable admin DSAR list' });
  }
  const ok =
    req.headers['x-api-key'] === adminKey ||
    (typeof req.headers.authorization === 'string' &&
      req.headers.authorization === `Bearer ${adminKey}`);
  if (!ok) return res.status(401).json({ error: 'Unauthorized' });

  audit('dsar.list', {});
  res.json({ requests: listDsar(100) });
});

export default router;
