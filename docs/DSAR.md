# Automated DSAR workflows

Potso includes server-side automation for common data-subject requests under GDPR-style regimes.

**Not legal advice.** Identity verification for high-risk erasures may still require a human process in your organisation.

## Endpoints

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/dsar/request` | Rate limit (+ API key if configured) |
| `GET` | `/api/dsar/:id?token=` | DSAR token or API key |
| `GET` | `/api/dsar/:id/export?token=` | DSAR token |
| `POST` | `/api/dsar/:id/process` | DSAR token or API key |
| `GET` | `/api/dsar` | API key (admin list) |

## Request types

| `type` | Automation |
|--------|------------|
| `access` | Builds JSON export (Firebase profile + chats if any) |
| `portability` | Same export package |
| `erasure` | Deletes Firebase Auth user + Firestore chats/profile when found |
| `rectification` | Merges `rectificationPayload` into profile |
| `restriction` | Sets `processingRestricted` on user doc |

## Example

```bash
curl -s -X POST http://localhost:8080/api/dsar/request \
  -H 'Content-Type: application/json' \
  -d '{"type":"access","email":"user@example.com"}'

# Response includes id + token (save token)
curl -s "http://localhost:8080/api/dsar/dsar_xxx?token=TOKEN"
curl -s "http://localhost:8080/api/dsar/dsar_xxx/export?token=TOKEN" -o export.json
```

## Guest mode limitation

Chat history stored only in **browser localStorage** is **not** readable by the server. Export packages note this; subjects must clear site data locally for full erasure of guest sessions.

## Storage

Tickets and exports are stored under `data/dsar/` (gitignored). Protect this directory on disk; restrict admin API access with `API_ACCESS_KEY`.

## SLA

Automation often completes immediately. GDPR still expects handling within **one month** (extensions possible). Track partial/failed tickets manually.
