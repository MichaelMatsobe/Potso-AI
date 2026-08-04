# Potso AI

Multi-agent cognition UI. **Default stack: open-source, self-hosted, no quotas** (Ollama).

## Quick start

```bash
# 1. Local model runtime
# https://ollama.com
ollama pull llama3.2
ollama serve

# 2. App
git checkout dev/freebuff-provider
cp .env.example .env.local
npm install
npm run dev
```

- Web: http://localhost:3000  
- API health: http://localhost:8080/api/health  
- Smoke test: `npm run smoke`

### `.env.local` (minimum)

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
OLLAMA_MODEL=llama3.2
VITE_API_URL=http://localhost:8080/api
```

Firebase is **optional**. Guest mode works without it.

## Architecture

```
Web / Mobile → POST /api/ai/chat → aiService
                                    ├─ ollama (default)
                                    ├─ freebuff (optional)
                                    └─ gemini (optional)
```

## Mobile

```bash
cd mobile
cp .env.example .env
# EXPO_PUBLIC_API_URL=http://<your-lan-ip>:8080/api
npm install
npm start
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Web (:3000) + API (:8080) |
| `npm run smoke` | Health + AI chat smoke test |
| `npm run lint` | Typecheck |

## Docs

- [FREEBUFF_SETUP.md](./FREEBUFF_SETUP.md) — open-source + optional providers  
- [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) — optional auth  

Created by Michael Aaron Matsobe.
