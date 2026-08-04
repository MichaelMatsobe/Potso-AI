/**
 * Automated DSAR (Data Subject Access Request) workflows.
 * Supports access, portability, erasure, rectification tickets.
 * When Firebase is configured, exports/deletes user-linked data automatically.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { isFirebaseReady, getFirestore, getAuth } from '../config/firebase.js';

export type DsarType = 'access' | 'portability' | 'erasure' | 'rectification' | 'restriction';
export type DsarStatus =
  | 'received'
  | 'identity_pending'
  | 'processing'
  | 'completed'
  | 'partial'
  | 'rejected'
  | 'failed';

export interface DsarRequest {
  id: string;
  type: DsarType;
  status: DsarStatus;
  email: string;
  userId?: string;
  notes?: string;
  rectificationPayload?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  tokenHash: string;
  resultSummary?: string;
  exportPath?: string;
  autoProcessed: boolean;
  steps: Array<{ at: string; action: string; detail?: string }>;
}

const DATA_DIR = path.join(process.cwd(), 'data', 'dsar');
const EXPORT_DIR = path.join(DATA_DIR, 'exports');

function ensureDirs() {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

function requestPath(id: string) {
  return path.join(DATA_DIR, `${id}.json`);
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function newId() {
  return `dsar_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
}

function newToken() {
  return crypto.randomBytes(24).toString('hex');
}

function save(req: DsarRequest) {
  ensureDirs();
  fs.writeFileSync(requestPath(req.id), JSON.stringify(req, null, 2), 'utf-8');
}

function load(id: string): DsarRequest | null {
  const p = requestPath(id);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as DsarRequest;
}

function addStep(req: DsarRequest, action: string, detail?: string) {
  req.steps.push({ at: new Date().toISOString(), action, detail });
  req.updatedAt = new Date().toISOString();
}

export function verifyDsarToken(req: DsarRequest, token: string): boolean {
  return req.tokenHash === hashToken(token);
}

export async function createDsarRequest(input: {
  type: DsarType;
  email: string;
  userId?: string;
  notes?: string;
  rectificationPayload?: Record<string, unknown>;
}): Promise<{ request: DsarRequest; token: string }> {
  const type = input.type;
  if (!['access', 'portability', 'erasure', 'rectification', 'restriction'].includes(type)) {
    throw new Error('Invalid DSAR type');
  }
  const email = String(input.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) throw new Error('Valid email is required');

  const id = newId();
  const token = newToken();
  const now = new Date().toISOString();

  const request: DsarRequest = {
    id,
    type,
    status: 'received',
    email,
    userId: input.userId,
    notes: input.notes,
    rectificationPayload: input.rectificationPayload,
    createdAt: now,
    updatedAt: now,
    tokenHash: hashToken(token),
    autoProcessed: false,
    steps: [{ at: now, action: 'received', detail: `type=${type}` }],
  };

  save(request);

  // Auto-process immediately when possible
  const processed = await processDsar(id, { auto: true });
  return { request: processed || request, token };
}

export function getDsar(id: string): DsarRequest | null {
  return load(id);
}

async function resolveUserId(email: string, explicit?: string): Promise<string | null> {
  if (explicit) return explicit;
  if (!isFirebaseReady()) return null;
  try {
    const user = await getAuth().getUserByEmail(email);
    return user.uid;
  } catch {
    return null;
  }
}

async function collectFirebasePackage(userId: string, email: string) {
  const db = getFirestore();
  const userRef = db.collection('users').doc(userId);
  const userSnap = await userRef.get();
  const profile = userSnap.exists ? userSnap.data() : null;

  const chatsSnap = await userRef.collection('chats').get();
  const chats: any[] = [];

  for (const chatDoc of chatsSnap.docs) {
    const messagesSnap = await chatDoc.ref.collection('messages').get();
    chats.push({
      id: chatDoc.id,
      ...chatDoc.data(),
      messages: messagesSnap.docs.map((m) => ({ id: m.id, ...m.data() })),
    });
  }

  return {
    exportedAt: new Date().toISOString(),
    subject: { email, userId },
    profile,
    chats,
    systems: ['firebase-auth', 'firestore-users', 'firestore-chats'],
    note: 'Guest-mode browser localStorage is not accessible to the server; subjects should export/clear it in the client.',
  };
}

async function eraseFirebaseUser(userId: string) {
  const db = getFirestore();
  const userRef = db.collection('users').doc(userId);
  const chatsSnap = await userRef.collection('chats').get();

  for (const chatDoc of chatsSnap.docs) {
    const messagesSnap = await chatDoc.ref.collection('messages').get();
    const batch = db.batch();
    messagesSnap.docs.forEach((m) => batch.delete(m.ref));
    batch.delete(chatDoc.ref);
    await batch.commit();
  }

  await userRef.delete().catch(() => {});
  await getAuth().deleteUser(userId).catch(() => {});
}

async function applyRectification(userId: string, payload: Record<string, unknown>) {
  const db = getFirestore();
  const allowed: Record<string, unknown> = {};
  if (typeof payload.displayName === 'string') allowed.displayName = payload.displayName;
  if (payload.preferences && typeof payload.preferences === 'object') {
    allowed.preferences = payload.preferences;
  }
  allowed.updatedAt = new Date().toISOString();
  allowed.rectifiedViaDsar = true;
  await db.collection('users').doc(userId).set(allowed, { merge: true });
  if (typeof payload.displayName === 'string') {
    await getAuth().updateUser(userId, { displayName: payload.displayName }).catch(() => {});
  }
}

export async function processDsar(
  id: string,
  opts: { auto?: boolean } = {}
): Promise<DsarRequest | null> {
  const req = load(id);
  if (!req) return null;
  if (req.status === 'completed') return req;

  req.status = 'processing';
  addStep(req, 'processing_started', opts.auto ? 'auto' : 'manual');
  save(req);

  try {
    const userId = await resolveUserId(req.email, req.userId);
    if (userId) {
      req.userId = userId;
      addStep(req, 'identity_resolved', userId);
    } else {
      addStep(
        req,
        'identity_unresolved',
        isFirebaseReady()
          ? 'No Firebase user for email'
          : 'Firebase not configured — server holds no account data'
      );
    }

    if (req.type === 'access' || req.type === 'portability') {
      ensureDirs();
      const pkg = userId && isFirebaseReady()
        ? await collectFirebasePackage(userId, req.email)
        : {
            exportedAt: new Date().toISOString(),
            subject: { email: req.email, userId: userId || null },
            profile: null,
            chats: [],
            systems: [] as string[],
            note:
              'No server-side personal data found. Guest chats live in browser localStorage only.',
            dsarTicket: {
              id: req.id,
              type: req.type,
              createdAt: req.createdAt,
            },
          };

      const exportFile = path.join(EXPORT_DIR, `${req.id}.json`);
      fs.writeFileSync(exportFile, JSON.stringify(pkg, null, 2), 'utf-8');
      req.exportPath = exportFile;
      req.status = 'completed';
      req.autoProcessed = true;
      req.completedAt = new Date().toISOString();
      req.resultSummary = userId
        ? 'Export package generated from Firebase-linked data.'
        : 'Export package generated (minimal / no server-side profile).';
      addStep(req, 'export_ready', exportFile);
    } else if (req.type === 'erasure') {
      if (userId && isFirebaseReady()) {
        await eraseFirebaseUser(userId);
        req.status = 'completed';
        req.autoProcessed = true;
        req.completedAt = new Date().toISOString();
        req.resultSummary =
          'Firebase Auth user and Firestore chats/profile deleted where present.';
        addStep(req, 'erasure_completed', userId);
      } else {
        req.status = 'partial';
        req.completedAt = new Date().toISOString();
        req.resultSummary =
          'No server-side account to erase. Subject should clear browser localStorage / app data.';
        addStep(req, 'erasure_partial', 'no firebase account');
      }
    } else if (req.type === 'rectification') {
      if (userId && isFirebaseReady() && req.rectificationPayload) {
        await applyRectification(userId, req.rectificationPayload);
        req.status = 'completed';
        req.autoProcessed = true;
        req.completedAt = new Date().toISOString();
        req.resultSummary = 'Profile fields updated.';
        addStep(req, 'rectification_completed');
      } else {
        req.status = 'partial';
        req.completedAt = new Date().toISOString();
        req.resultSummary = 'Rectification requires Firebase user + rectificationPayload.';
        addStep(req, 'rectification_partial');
      }
    } else if (req.type === 'restriction') {
      // Flag account; no automated ban system beyond metadata
      if (userId && isFirebaseReady()) {
        const db = getFirestore();
        await db.collection('users').doc(userId).set(
          {
            processingRestricted: true,
            processingRestrictedAt: new Date().toISOString(),
            processingRestrictedNote: req.notes || 'DSAR restriction',
          },
          { merge: true }
        );
        req.status = 'completed';
        req.autoProcessed = true;
        req.completedAt = new Date().toISOString();
        req.resultSummary = 'processingRestricted flag set on user profile.';
        addStep(req, 'restriction_flagged');
      } else {
        req.status = 'partial';
        req.completedAt = new Date().toISOString();
        req.resultSummary = 'Restriction recorded on ticket only (no account).';
        addStep(req, 'restriction_ticket_only');
      }
    }

    save(req);
    return req;
  } catch (e) {
    req.status = 'failed';
    addStep(req, 'failed', e instanceof Error ? e.message : String(e));
    save(req);
    return req;
  }
}

export function readExport(id: string): string | null {
  const req = load(id);
  if (!req?.exportPath || !fs.existsSync(req.exportPath)) return null;
  return fs.readFileSync(req.exportPath, 'utf-8');
}

export function listDsar(limit = 50): Array<Pick<DsarRequest, 'id' | 'type' | 'status' | 'email' | 'createdAt' | 'completedAt'>> {
  ensureDirs();
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.startsWith('dsar_') && f.endsWith('.json'))
    .slice(0, limit);
  return files
    .map((f) => {
      const r = load(f.replace(/\.json$/, ''));
      if (!r) return null;
      return {
        id: r.id,
        type: r.type,
        status: r.status,
        email: r.email,
        createdAt: r.createdAt,
        completedAt: r.completedAt,
      };
    })
    .filter(Boolean) as any;
}
