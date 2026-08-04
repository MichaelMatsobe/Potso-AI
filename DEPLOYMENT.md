# Deployment — Potso AI (free / open source)

## Readiness status (dev/freebuff-provider)

| Area | Status | Notes |
|------|--------|-------|
| Guest web chat | **Ready** | `/api/ai/chat` public, localStorage history |
| Ollama AI | **Ready** | Default provider, no quotas |
| Freebuff AI | **Optional** | `AI_PROVIDER=freebuff` |
| Browser Live Voice | **Ready** | Web Speech API |
| Local Whisper/Piper | **Optional** | Set `VOICE_*_URL` |
| Production Docker | **Ready for self-host** | Compose includes Ollama |
| Firebase auth/sync | **Optional** | Guest mode without it |
| Mobile Expo | **Basic** | Guest chat; not store-ready |
| Multi-tenant SaaS | **Not ready** | No rate limits, hardening |
| Public internet harding | **Partial** | Add HTTPS, rate limits, CORS lockdown |

**Verdict:** Ready for **self-hosted / private deployment** (LAN, VPS, Docker).  
**Not** fully ready for large public multi-user production without extra security and ops work.

## Quick self-host (recommended)

```bash
git checkout dev/freebuff-provider
cp .env.example .env.local
# AI_PROVIDER=ollama is default

docker compose up -d --build
# Pull a model once:
docker compose exec ollama ollama pull llama3.2

# App: http://localhost:8080  (API + static UI in production)
curl -s http://localhost:8080/api/health
```

After first model pull, open the UI and send a chat. Badge should show **AI Online · ollama**.

## Local dev (no Docker)

```bash
ollama pull llama3.2 && ollama serve
cp .env.example .env.local
npm install
npm run dev
# Web :3000 · API :8080
npm test && npm run smoke
```

## Environment (production)

| Variable | Required | Default |
|----------|----------|---------|
| `AI_PROVIDER` | No | `ollama` |
| `OLLAMA_BASE_URL` | No | `http://127.0.0.1:11434/v1` |
| `OLLAMA_MODEL` | No | `llama3.2` |
| `ALLOWED_ORIGINS` | Yes in public | `*` in compose |
| `VOICE_STT_URL` | No | unset = browser STT |
| `VOICE_TTS_URL` | No | unset = browser TTS |
| Firebase vars | No | guest mode |

**Do not set Gemini keys** — not supported on this branch.

## Production checklist before public traffic

- [ ] HTTPS (Caddy / nginx / Traefik)
- [ ] Restrict `ALLOWED_ORIGINS`
- [ ] Rate-limit `/api/ai/chat` and `/api/voice/*`
- [ ] Resource limits on Ollama (RAM/GPU)
- [ ] Backups if Firebase enabled
- [ ] Monitoring on `/api/health`
- [ ] Do not expose Ollama port publicly without auth

## Cloud notes

| Target | Feasible? |
|--------|-----------|
| VPS + Docker Compose | Yes |
| Home lab / LAN | Yes |
| Cloud Run alone | Awkward — Ollama needs persistent GPU/CPU host |
| Vercel frontend only | UI only; API+Ollama elsewhere |

## API surface

- `GET /api/health`
- `POST /api/ai/chat`
- `GET /api/voice/status`
- `POST /api/voice/stt`
- `POST /api/voice/tts`
- Auth/chat routes if Firebase configured
