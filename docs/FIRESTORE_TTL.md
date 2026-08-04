# Firestore TTL policies

Potso stamps an **`expireAt`** field (Firestore `Timestamp`) on chat and message documents.  
Google Cloud must have a **TTL policy** on that field before automatic deletion runs.

## Application behavior

| Document | Path | TTL field | Default days (env) |
|----------|------|-----------|---------------------|
| Chat | `users/{uid}/chats/{chatId}` | `expireAt` | `RETENTION_CHAT_DAYS` (180) |
| Message | `users/{uid}/chats/{chatId}/messages/{id}` | `expireAt` | `RETENTION_MESSAGE_DAYS` or chat days |

On each new message, the parent chat’s `expireAt` is **refreshed** (sliding retention).

```env
RETENTION_CHAT_DAYS=180
RETENTION_MESSAGE_DAYS=180
```

## Enable TTL in Google Cloud (required once)

TTL is **not** created by the Node SDK alone. Enable it in GCP:

### Console

1. Open [Firestore](https://console.cloud.google.com/firestore) → your database.
2. **Time-to-live** (or “TTL policies”).
3. Create policy:
   - **Field name:** `expireAt`
   - Collection group: optional filter, or entire database if all `expireAt` uses are intentional.
4. Wait until policy status is **Active** (can take minutes to hours).

### gcloud

```bash
# Example — adjust project/database
gcloud firestore fields ttls update expireAt \
  --collection-group=messages \
  --enable-ttl \
  --project=YOUR_PROJECT_ID

gcloud firestore fields ttls update expireAt \
  --collection-group=chats \
  --enable-ttl \
  --project=YOUR_PROJECT_ID
```

Exact flags can vary by gcloud version; prefer Console if unsure.

## Important constraints

- `expireAt` must be a **timestamp** type (we use `admin.firestore.Timestamp`).
- Deletion is **best-effort asynchronous** (often within 24–72 hours after expiry, not instant).
- TTL does **not** replace DSAR erasure for immediate delete — use DSAR/account delete for that.
- Documents **without** `expireAt` are never TTL-deleted.
- Subcollections are **not** cascade-deleted when a parent expires; messages need their own `expireAt` (we set both).

## Backfill existing documents

Old chats/messages written before this change lack `expireAt`. Options:

1. One-off Admin script: query collection group `messages` / `chats`, set `expireAt`.
2. Accept that only new data is TTL-managed until backfilled.

## Verification

1. Create a chat + message with Firebase configured.
2. In Console, confirm `expireAt` is a timestamp ~N days ahead.
3. Confirm TTL policy is **Active** on `expireAt`.
4. (Test only) Set a document `expireAt` to the past and wait for deletion.

## Guest mode

Without Firebase, Firestore TTL does not apply. Guest data remains in the browser only.
