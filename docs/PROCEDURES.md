# Operational procedures — Potso AI (SOP)

**Not legal advice.** Index: [POLICY_PACK.md](./POLICY_PACK.md).

## Pre-flight (every deploy)

```bash
npm run sop-check    # required policy/code artifacts present
npm test             # unit + perf
# with server up:
npm run smoke
```

## 1. Continuous controls

| Control | Mechanism |
|---------|-----------|
| Rate limit | `RATE_LIMIT_*` |
| API key | `API_ACCESS_KEY` on AI/voice/chat |
| Security headers | middleware |
| DSAR | auto on `/api/dsar/request` + UI `/dsar.html` |
| Audit log | `data/audit/audit.jsonl` |
| Firestore TTL | `expireAt` + GCP policy |
| Disk retention | `RETENTION_AUTO_PURGE` / `npm run maintenance` |

## 2. Deploy

1. Copy `.env.example` → `.env.local`; set key, CORS, retention.
2. `docker compose up -d --build`
3. `docker compose exec ollama ollama pull llama3.2`
4. Health: `curl -s localhost:8080/api/health`
5. If Firebase: enable TTL on `expireAt` ([FIRESTORE_TTL.md](./FIRESTORE_TTL.md))
6. Operator fills Privacy/Terms identity + GDPR/jurisdiction placeholders

## 3. DSAR (subject)

1. Open **`/dsar.html`** or `POST /api/dsar/request`
2. Save returned **token**
3. Status / export with token
4. Erasure: also **Clear local guest data** on `/dsar.html`
5. Admin: `GET /api/dsar` with API key

## 4. Retention

| Data | Enforcement |
|------|-------------|
| Firestore chats/messages | `expireAt` + GCP TTL |
| DSAR exports | purge job |
| DSAR tickets | purge job |
| Guest browser | subject clears localStorage |

```bash
npm run maintenance
curl -X POST localhost:8080/api/admin/maintenance -H "X-API-Key: $API_ACCESS_KEY"
```

## 5. Incident

1. Rotate `API_ACCESS_KEY`
2. Review `data/audit/audit.jsonl` and host logs (no prompt bodies)
3. [SECURITY.md](../SECURITY.md)
4. Breach path: GDPR checklist `[BREACH_NOTIFY]`

## 6–8. Models, backup, decommission

See previous sections in POLICY_PACK / MODEL_LICENSES. Decommission: disable ingress → final DSAR window → wipe data → revoke keys.
