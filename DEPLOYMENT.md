# Deployment — Potso AI

## Production config (required)

1. Copy **`.env.production.example`** → server **`.env.local`**.
2. Set a strong **`API_ACCESS_KEY`** (and matching **`VITE_API_ACCESS_KEY`** if the web UI must call protected APIs).
3. Set **`ALLOWED_ORIGINS`** and **`APP_URL`** to your real HTTPS origin (not `*`).
4. Keep **`RETENTION_AUTO_PURGE=true`**.
5. Terminate **TLS** at Caddy/nginx/Traefik in front of port 8080.

```bash
docker compose up -d --build
docker compose exec ollama ollama pull llama3.2
curl -s https://YOUR_DOMAIN/api/health
npm run sop-check   # from repo
```

## GCP Firestore TTL (when Firebase is used)

App stamps **`expireAt`** on chats/messages. Enable the policy:

```bash
export GCP_PROJECT=your-gcp-project-id
chmod +x scripts/enable-firestore-ttl.sh
./scripts/enable-firestore-ttl.sh
```

Or Console → Firestore → TTL → field **`expireAt`** for collection groups **`chats`** and **`messages`**.

Details: [docs/FIRESTORE_TTL.md](./docs/FIRESTORE_TTL.md).

## Legal

Operator defaults completed for **Michael Aaron Matsobe** in `PRIVACY.md`, `TERMS.md`, `docs/JURISDICTIONS.md`, `docs/GDPR_CHECKLIST.md`, and public HTML pages.  
Add company registration address if you incorporate or offer publicly under a legal entity.

## Readiness

| Item | Status |
|------|--------|
| Self-host chat + voice | Ready |
| Production env template | `.env.production.example` |
| TTL automation (app side) | Ready; GCP enable once |
| Legal templates | Author-filled defaults |
| Public SaaS hardening | Operator HTTPS + keys + CORS |
