# Potso AI

Multi-agent cognition on a **free open-source** stack: **Ollama** (default) or optional Freebuff.  
No Gemini. No paid AI APIs in the default path.

**License:** [Apache License 2.0](./LICENSE)  
**Branch:** `dev/freebuff-provider`  
**Deploy:** Ready for self-host — see [DEPLOYMENT.md](./DEPLOYMENT.md)

## Legal

| Document | Purpose |
|----------|---------|
| [LICENSE](./LICENSE) | Apache-2.0 software license |
| [NOTICE](./NOTICE) | Attribution / third-party notes |
| [TERMS.md](./TERMS.md) | Terms of use (template) |
| [PRIVACY.md](./PRIVACY.md) | Privacy notice (template) |
| [SECURITY.md](./SECURITY.md) | Vulnerability reporting |

Deployed instances also serve `/privacy.html` and `/terms.html`.

> These documents are **not legal advice**. Self-hosters are typically the data controller for their instance and must adapt policies for their jurisdiction (e.g. GDPR, POPIA).

## Quick start

```bash
ollama pull llama3.2 && ollama serve
git checkout dev/freebuff-provider
cp .env.example .env.local
npm install && npm run dev
```

- Web: http://localhost:3000  
- API health: http://localhost:8080/api/health  
- Tests: `npm test`

## Docker self-host

```bash
docker compose up -d --build
docker compose exec ollama ollama pull llama3.2
# http://localhost:8080
```

## Docs

- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [FREEBUFF_SETUP.md](./FREEBUFF_SETUP.md) — providers
- [docs/VOICE_LOCAL.md](./docs/VOICE_LOCAL.md)
- [docs/WEBRTC.md](./docs/WEBRTC.md)

Created by Michael Aaron Matsobe.
