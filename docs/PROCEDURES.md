# Operational procedures — Potso AI

Runbook for a fully functioning self-hosted deployment.  
**Not legal advice.** Pair with [POLICY_PACK.md](./POLICY_PACK.md).

## 1. Daily / continuous automation

| Job | How |
|-----|-----|
| Rate limiting | Built-in (`RATE_LIMIT_*`) |
| Security headers | Built-in |
| API key gate | `API_ACCESS_KEY` |
| DSAR auto-process | On `POST /api/dsar/request` |
| Firestore TTL | GCP policy on `expireAt` + app stamps field |
| DSAR disk purge | `RETENTION_AUTO_PURGE=true` or `npm run maintenance` |

## 2. Deploy procedure

1. Fill `.env.local` from `.env.example` (set `API_ACCESS_KEY`, `ALLOWED_ORIGINS`, retention days).
2. `docker compose up -d --build` (or `npm run dev` for local).
3. `docker compose exec ollama ollama pull llama3.2`.
4. `curl -s localhost:8080/api/health` → `aiOnline: true`.
5. Enable Firestore TTL on `expireAt` if Firebase is used ([FIRESTORE_TTL.md](./FIRESTORE_TTL.md)).
6. Publish `/privacy.html` + `/terms.html` with operator identity filled in.
7. Complete [GDPR_CHECKLIST.md](./GDPR_CHECKLIST.md) + [JURISDICTIONS.md](./JURISDICTIONS.md) placeholders.

## 3. DSAR procedure

1. Subject submits `POST /api/dsar/request` with `{ type, email }`.
2. System auto-processes; returns `id` + `token`.
3. Subject downloads export via `GET /api/dsar/:id/export?token=`.
4. Partial guest-only cases: instruct subject to clear browser site data.
5. Admin list: `GET /api/dsar` with API key.
6. Escalation: human review for identity disputes / legal holds.

## 4. Retention procedure

| Data | Mechanism |
|------|-----------|
| Firestore chats/messages | `expireAt` + GCP TTL |
| DSAR exports on disk | Auto purge (`RETENTION_DSAR_EXPORT_DAYS`) |
| DSAR tickets | Auto purge after `RETENTION_DSAR_TICKET_DAYS` |
| Guest localStorage | User-controlled |

Manual run:

```bash
npm run maintenance
# or
curl -X POST http://localhost:8080/api/admin/maintenance -H "X-API-Key: $API_ACCESS_KEY"
```

## 5. Incident / security procedure

1. Rotate `API_ACCESS_KEY` and redeploy.
2. Review logs; avoid retaining prompt bodies.
3. Follow [SECURITY.md](../SECURITY.md) for vulnerability reports.
4. Personal data breach: follow 72h notification path in GDPR checklist `[BREACH_NOTIFY]`.

## 6. Model license procedure

1. Inventory models in [MODEL_LICENSES.md](./MODEL_LICENSES.md).
2. Before `ollama pull` of a new model, read upstream license.
3. Record commercial-use status in inventory table.

## 7. Backup procedure

1. Backup `.env` secrets offline (encrypted).
2. If Firebase: use GCP backup / export per Google docs.
3. Backup `data/dsar/` if compliance evidence required.
4. Backup retention ≤ policy max (do not keep erased user data indefinitely).

## 8. Shutdown / decommission

1. Disable public ingress.
2. Run final DSAR window if required.
3. Delete Firestore data / local disks per retention.
4. Revoke API keys and Firebase service accounts.
