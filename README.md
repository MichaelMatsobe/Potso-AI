# Potso AI

Multi-agent cognition on a **free open-source** stack (**Ollama** default). No Gemini in the default path.

**Author:** Michael Aaron Matsobe  
**License:** [Apache-2.0](./LICENSE)  
**Branch:** `dev/freebuff-provider`

## Production

1. Use [`.env.production.example`](./.env.production.example)
2. [DEPLOYMENT.md](./DEPLOYMENT.md) — TLS, keys, CORS, Docker
3. Firestore TTL: `scripts/enable-firestore-ttl.sh` (if Firebase)
4. Legal: [PRIVACY.md](./PRIVACY.md), [TERMS.md](./TERMS.md), [/dsar.html](./public/dsar.html)
5. SOP: `npm run sop-check` · [docs/PROCEDURES.md](./docs/PROCEDURES.md)

## Quick start (dev)

```bash
ollama pull llama3.2 && ollama serve
git checkout dev/freebuff-provider
cp .env.example .env.local
npm install && npm run dev
```

## Policy pack

See [docs/POLICY_PACK.md](./docs/POLICY_PACK.md).
