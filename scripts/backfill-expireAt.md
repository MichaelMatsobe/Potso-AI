# Backfill Firestore `expireAt`

Documents created before TTL stamping lack `expireAt` and will not auto-delete.

## Option A — Console / script with Admin SDK

With Firebase credentials and `firebase-admin`:

1. Query collection group `messages` and `chats`.
2. For each doc missing `expireAt`, set:
   - `expireAt` = now + `RETENTION_CHAT_DAYS` (Timestamp)
   - `retentionDays` = that number

## Option B — Accept only new data

New writes from Potso already set `expireAt`. Old data ages out only via manual delete or DSAR erasure.

## Enable TTL policy first

```bash
export GCP_PROJECT=your-project
./scripts/enable-firestore-ttl.sh
```
