# Potso AI — Architecture Analysis (`dev/freebuff-provider`)

## Overview

Potso AI is a **full-stack multi-agent system** on a **free / open-source** stack:

| Layer | Default |
|-------|---------|
| AI | **Ollama** (local open weights) with optional **Freebuff** hybrid failover |
| Auth / history | Optional Firebase; **guest mode** works without it |
| Voice | Browser Speech API; optional local Whisper STT / Piper TTS |
| Frontend | React 19 + Vite + Tailwind |
| Backend | Express + TypeScript (`server.ts`) |
| Mobile | Expo / React Native (partial) |

Four collaborative agents: **Modisa** (research), **Tshepo** (synthesis), **Kgakgamatso** (audit), **Tlhaloganyo** (narrative).

**Gemini / paid Google AI APIs are not used on this branch.**

---

## Request path

```
UI (Vite :3000)
  → GET/POST /api/*  (Vite proxy → Express :8080)
      → /api/ai/chat     → aiService (Ollama → Freebuff)
      → /api/voice/*     → voiceLocal (optional)
      → /api/chat/*      → Firestore (requires Firebase)
      → /api/auth/*      → Firebase Auth
      → /api/dsar/*      → DSAR tickets
      → /api/health      → probes (public)
```

When the API is down or the browser is offline, the client falls back to **WebLLM** (WebGPU) if enabled, then a template offline reply.

---

## Backend (`/backend`)

| Path | Role |
|------|------|
| `services/aiService.ts` | Hybrid provider routing, JSON extraction, multi-agent prompt |
| `services/voiceLocal.ts` | Optional local STT/TTS proxies |
| `services/retention.ts` / `maintenance.ts` | TTL + scheduled purge |
| `services/dsarService.ts` | Access / erasure workflows |
| `routes/ai.ts` | `POST /chat`, `GET /status` |
| `routes/chat.ts` | Firestore-backed chats (auth required) |
| `routes/auth.ts` | Profile / init-user |
| `middleware/accessControl.ts` | Rate limit + optional API key |
| `middleware/auth.ts` | Firebase ID token verification |

Provider modes (`AI_PROVIDER`):

| Value | Behavior |
|-------|----------|
| `auto` / `hybrid` (default) | Ollama first → Freebuff if Ollama fails and is configured |
| `ollama` | Local only |
| `freebuff` | Freebuff first → Ollama if Freebuff fails |

---

## Frontend (`/src`)

- `App.tsx` — guest chat UI, localStorage history, health polling
- `services/aiClient.ts` — server → WebLLM → offline template chain
- `services/webllmClient.ts` — in-browser model fallback
- `components/LiveVoiceModal.tsx` — free voice (local or Web Speech)
- `components/Login.tsx` / `Signup.tsx` — optional Google / email auth
- `utils/jsonExtract.ts` — pure JSON helpers (aligned with unit tests)

---

## Known gaps (honest)

| Area | Status |
|------|--------|
| Guest AI chat (Ollama/Freebuff) | Functional |
| Firebase-backed chat API | Functional when credentials are set |
| Mobile auth screens | Incomplete |
| Streaming token responses | Not implemented |
| Image generation from `imagePrompt` | Schema only |
| Shared `extractJSON` between backend and `src/utils` | Duplicated (backend stays self-contained for `tsx`) |
| ARCHITECTURE docs historically referenced Gemini | Updated on this branch |

---

## Verification

```bash
npm install
ollama pull llama3.2 && ollama serve
cp .env.example .env.local
npm run dev
curl -s http://localhost:8080/api/health
npm run test:unit
npm run smoke   # with server up
```

See [FREEBUFF_SETUP.md](./FREEBUFF_SETUP.md), [docs/HYBRID_PROVIDERS.md](./docs/HYBRID_PROVIDERS.md), [README.md](./README.md).
