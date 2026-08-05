# Potso AI — Implementation Summary (`dev/freebuff-provider`)

South African multi-agent cognition on a **free / open-source** stack.

## Stack (this branch)

| Layer | Implementation |
|-------|----------------|
| AI | **Ollama** (primary) + optional **Freebuff** hybrid failover |
| API | Express (`server.ts`) — `/api/ai`, `/api/voice`, `/api/chat`, `/api/auth`, `/api/dsar`, `/api/admin` |
| Web | React 19 + Vite + Tailwind (`src/`) |
| Mobile | Expo (partial — chat/settings tabs; auth screens incomplete) |
| Auth / history | Optional Firebase; **guest mode** works without credentials |
| Voice | Browser Web Speech; optional local Whisper STT / Piper TTS |
| Browser fallback | WebLLM (WebGPU) when API offline |

**Gemini / paid Google AI APIs are not used on this branch.** Legacy `geminiService` files re-export `aiService` / `aiClient` only.

## Agents

Modisa (research) · Tshepo (synthesis) · Kgakgamatso (audit) · Tlhaloganyo (narrative)

## Provider modes (`AI_PROVIDER`)

| Value | Behavior |
|-------|----------|
| `auto` / `hybrid` (default) | Ollama first → Freebuff if Ollama fails and is configured |
| `ollama` | Local only |
| `freebuff` | Freebuff first → Ollama if Freebuff fails |

See [FREEBUFF_SETUP.md](./FREEBUFF_SETUP.md) and [docs/HYBRID_PROVIDERS.md](./docs/HYBRID_PROVIDERS.md).

## Key paths

```
backend/services/aiService.ts   # hybrid routing, JSON extract, multi-agent prompt
backend/routes/ai.ts            # POST /api/ai/chat, GET /api/ai/status
src/services/aiClient.ts        # server → WebLLM → offline template
src/App.tsx                     # guest chat UI + health badge
server.ts                       # Express entry, health probe, middleware
```

## Verify

```bash
cp .env.example .env.local
npm install
ollama pull llama3.2 && ollama serve
npm run dev
curl -s http://localhost:8080/api/health
npm run test:unit
npm run smoke   # server must be up
```

## Known gaps

| Area | Status |
|------|--------|
| Guest AI chat | Functional |
| Firebase chat API | Functional when credentials set |
| Mobile auth screens | Incomplete |
| Token streaming | Not implemented |
| Image gen from `imagePrompt` | Schema only |
| `extractJSON` shared package | Duplicated (backend self-contained for `tsx`) |

## Version

**1.4.0** — Apache-2.0 — Michael Aaron Matsobe
