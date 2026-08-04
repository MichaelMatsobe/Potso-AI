# Potso AI

Multi-agent cognition. **Open-source / free only** — Ollama (default) or Freebuff. No Gemini. No paid APIs.

## Quick start

```bash
ollama pull llama3.2 && ollama serve

git checkout dev/freebuff-provider
cp .env.example .env.local
npm install
npm run dev
```

- Web: http://localhost:3000  
- Health: http://localhost:8080/api/health  
- Smoke: `npm run smoke`

### Voice (Go Live)

Uses browser **SpeechRecognition + speechSynthesis** around `/api/ai/chat`. Free, no quota. See [docs/VOICE.md](./docs/VOICE.md).

### Providers

| Provider | Quotas | Notes |
|----------|--------|-------|
| **Ollama** (default) | None | Self-hosted open weights |
| **Freebuff** | May have regional limits | Optional hosted free models |

### Mobile

```bash
cd mobile && npm install && npm start
# EXPO_PUBLIC_API_URL=http://<lan-ip>:8080/api
```

Created by Michael Aaron Matsobe.
