# Potso AI

Multi-agent cognition on a **free open-source** stack: **Ollama** (default) or optional Freebuff.  
No Gemini. No paid AI APIs in the default path.

**License:** [Apache License 2.0](./LICENSE)  
**Branch:** `dev/freebuff-provider`

## Legal & compliance

| Document | Purpose |
|----------|---------|
| [LICENSE](./LICENSE) / [NOTICE](./NOTICE) | Apache-2.0 |
| [TERMS.md](./TERMS.md) / [PRIVACY.md](./PRIVACY.md) | Terms & privacy templates |
| [SECURITY.md](./SECURITY.md) | Vulnerability reporting |
| [docs/GDPR_CHECKLIST.md](./docs/GDPR_CHECKLIST.md) | GDPR operator checklist |
| [docs/JURISDICTIONS.md](./docs/JURISDICTIONS.md) | Multi-country placeholders |
| [docs/MODEL_LICENSES.md](./docs/MODEL_LICENSES.md) | Model weight obligations |

> Not legal advice. Fill `[PLACEHOLDERS]` before public launch.

## Access control

```env
API_ACCESS_KEY=long-random-string
VITE_API_ACCESS_KEY=long-random-string   # same value for web client
RATE_LIMIT_MAX=60
ALLOWED_ORIGINS=https://your-domain.example
```

When `API_ACCESS_KEY` is set, `/api/ai`, `/api/voice`, and `/api/chat` require `Authorization: Bearer …` or `X-API-Key`. `/api/health` stays public.

## Quick start

```bash
ollama pull llama3.2 && ollama serve
git checkout dev/freebuff-provider
cp .env.example .env.local
npm install && npm run dev
```

## Docker

```bash
docker compose up -d --build
docker compose exec ollama ollama pull llama3.2
```

See [DEPLOYMENT.md](./DEPLOYMENT.md).

Created by Michael Aaron Matsobe.
