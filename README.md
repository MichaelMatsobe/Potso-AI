# Potso AI

South African multi-agent cognition on a **free / open-source** stack.

| Layer | Default |
|-------|---------|
| AI | **Ollama** (local open weights) with optional **Freebuff** hybrid failover |
| Auth / history | Optional Firebase; guest mode works without it |
| Voice | Browser Speech API; optional local STT/TTS |

**Author:** Michael Aaron Matsobe  
**License:** [Apache-2.0](./LICENSE)  
**Branch:** `dev/freebuff-provider`

## Quick start (dev)

```bash
# 1) Local model
ollama pull llama3.2 && ollama serve

# 2) App
git checkout dev/freebuff-provider
cp .env.example .env.local
npm install && npm run dev
```

- Web UI: http://localhost:3000  
- API health: http://localhost:8080/api/health  

Expected health shape includes `aiMode`, `ollama`, and optional `freebuff`.

## Providers (`AI_PROVIDER`)

| Value | Behavior |
|-------|----------|
| `auto` / `hybrid` (default) | Ollama first → Freebuff if Ollama fails and is configured |
| `ollama` | Local only |
| `freebuff` | Freebuff first → Ollama if Freebuff fails |

See [FREEBUFF_SETUP.md](./FREEBUFF_SETUP.md) and [docs/HYBRID_PROVIDERS.md](./docs/HYBRID_PROVIDERS.md).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite + Express |
| `npm run lint` | Typecheck (web + backend) |
| `npm test` | Unit tests |
| `npm run smoke` | Live HTTP smoke (server must be up) |
| `npm run sop-check` | Policy / SOP file checks |

## Production

1. [`.env.production.example`](./.env.production.example)
2. [DEPLOYMENT.md](./DEPLOYMENT.md) — TLS, keys, CORS, Docker
3. Firestore TTL: `scripts/enable-firestore-ttl.sh` (if Firebase)
4. Legal: [PRIVACY.md](./PRIVACY.md), [TERMS.md](./TERMS.md), [/dsar.html](./public/dsar.html)
5. SOP: `npm run sop-check` · [docs/PROCEDURES.md](./docs/PROCEDURES.md)

## Policy pack

See [docs/POLICY_PACK.md](./docs/POLICY_PACK.md).
