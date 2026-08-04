# Potso AI

Multi-agent cognition on **free open-source** stack: **Ollama** (default) or Freebuff.  
No Gemini. No paid APIs.

**Branch:** `dev/freebuff-provider`  
**Deploy status:** Ready for **self-host** (Docker Compose + Ollama). Not hardened for large public SaaS yet — see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Quick start (dev)

```bash
ollama pull llama3.2 && ollama serve
git checkout dev/freebuff-provider
cp .env.example .env.local
npm install && npm run dev
```

- Web: http://localhost:3000  
- Health: http://localhost:8080/api/health  
- Tests: `npm test` · Smoke: `npm run smoke`

## Self-host (Docker)

```bash
docker compose up -d --build
docker compose exec ollama ollama pull llama3.2
# UI + API: http://localhost:8080
```

## Features

| Feature | Stack |
|---------|--------|
| Chat | Ollama / Freebuff multi-agent JSON |
| Go Live | Browser Web Speech, or Whisper + Piper if configured |
| Guest mode | Works without Firebase |
| Mobile | Expo guest chat (`mobile/`) |

## Docs

- [DEPLOYMENT.md](./DEPLOYMENT.md) — readiness + ops
- [docs/VOICE_LOCAL.md](./docs/VOICE_LOCAL.md) — Whisper / Piper
- [docs/WEBRTC.md](./docs/WEBRTC.md) — streaming notes

Created by Michael Aaron Matsobe.
