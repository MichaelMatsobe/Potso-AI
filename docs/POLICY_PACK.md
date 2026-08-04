# Policy pack index

All operator policies and related automation for Potso AI (`dev/freebuff-provider`).

| Policy / procedure | Location | Automation |
|--------------------|----------|------------|
| Software license | [LICENSE](../LICENSE), [NOTICE](../NOTICE) | N/A |
| Terms of use | [TERMS.md](../TERMS.md), `/terms.html` | Static |
| Privacy notice | [PRIVACY.md](../PRIVACY.md), `/privacy.html` | Static |
| Security | [SECURITY.md](../SECURITY.md) | Headers, API key, rate limit |
| Access control | `.env` `API_ACCESS_KEY`, middleware | Enforced in server |
| GDPR checklist | [GDPR_CHECKLIST.md](./GDPR_CHECKLIST.md) | Manual fill + DSAR API |
| Jurisdictions | [JURISDICTIONS.md](./JURISDICTIONS.md) | Placeholders |
| Model licenses | [MODEL_LICENSES.md](./MODEL_LICENSES.md) | Manual inventory |
| DSAR | [DSAR.md](./DSAR.md) | Auto process on request |
| Firestore TTL | [FIRESTORE_TTL.md](./FIRESTORE_TTL.md) | `expireAt` stamps + GCP |
| Voice local | [VOICE_LOCAL.md](./VOICE_LOCAL.md) | Optional |
| WebRTC notes | [WEBRTC.md](./WEBRTC.md) | N/A |
| Operations runbook | [PROCEDURES.md](./PROCEDURES.md) | Maintenance job |
| Deployment | [DEPLOYMENT.md](../DEPLOYMENT.md) | Docker Compose |

## Minimum production env

```env
API_ACCESS_KEY=...
VITE_API_ACCESS_KEY=...
ALLOWED_ORIGINS=https://your.domain
RETENTION_CHAT_DAYS=180
RETENTION_MESSAGE_DAYS=180
RETENTION_DSAR_EXPORT_DAYS=30
RETENTION_DSAR_TICKET_DAYS=730
RETENTION_AUTO_PURGE=true
RETENTION_PURGE_INTERVAL_HOURS=24
AI_PROVIDER=ollama
```

## Admin API

```
GET  /api/admin/policy-status   # requires API key
POST /api/admin/maintenance     # run purges now
```
