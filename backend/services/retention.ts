/**
 * Data retention helpers for Firestore TTL.
 *
 * Firestore TTL deletes a document when a designated timestamp field is in the past.
 * You must enable the TTL policy once in Google Cloud on field path: expireAt
 * See docs/FIRESTORE_TTL.md
 */
import admin from 'firebase-admin';

/** Field name that must match the GCP Firestore TTL policy configuration */
export const TTL_FIELD = 'expireAt';

export function getRetentionDays(kind: 'chat' | 'message' | 'dsarExport' = 'chat'): number {
  if (kind === 'message') {
    return parseInt(process.env.RETENTION_MESSAGE_DAYS || process.env.RETENTION_CHAT_DAYS || '180', 10);
  }
  if (kind === 'dsarExport') {
    return parseInt(process.env.RETENTION_DSAR_EXPORT_DAYS || '30', 10);
  }
  return parseInt(process.env.RETENTION_CHAT_DAYS || '180', 10);
}

/** Firestore Timestamp for now + retention days (used as TTL field value) */
export function computeExpireAt(kind: 'chat' | 'message' | 'dsarExport' = 'chat'): admin.firestore.Timestamp {
  const days = getRetentionDays(kind);
  const ms = Date.now() + days * 24 * 60 * 60 * 1000;
  return admin.firestore.Timestamp.fromMillis(ms);
}

/** ISO string alternative when Timestamp is awkward (TTL still needs a timestamp type in Firestore) */
export function computeExpireAtDate(kind: 'chat' | 'message' | 'dsarExport' = 'chat'): Date {
  const days = getRetentionDays(kind);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/** Merge TTL + retention metadata onto a plain object before set() */
export function withTtl<T extends Record<string, unknown>>(
  data: T,
  kind: 'chat' | 'message' = 'message'
): T & { expireAt: admin.firestore.Timestamp; retentionDays: number } {
  return {
    ...data,
    [TTL_FIELD]: computeExpireAt(kind),
    retentionDays: getRetentionDays(kind),
  };
}
