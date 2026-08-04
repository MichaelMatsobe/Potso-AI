# Freebuff Provider Setup (dev/freebuff-provider)

This branch adds a **Freebuff** AI backend path so Potso-AI can run **without a Gemini API key**.

Freebuff itself is a free CLI coding agent. Potso-AI talks to it through an **OpenAI-compatible HTTP proxy** that community projects expose (`/v1/chat/completions`).

> Important: Freebuff is **not** Gemini. Structured multi-agent JSON is prompt-driven (not schema-enforced). Image generation is not available on the Freebuff path. Expect good but not identical behaviour.

---

## 1. Start a Freebuff OpenAI-compatible proxy

Pick one community proxy and run it locally. Examples:

### Option A — freebuff2api / Freebuff2API style

1. Get a Freebuff auth token:
   - Install CLI: `npm install -g freebuff`
   - Run `freebuff` once and complete login, **or**
   - Use a web token page used by the proxy project you chose.
2. Configure the proxy with your token (see that project's README).
3. Start the proxy so it listens on e.g. `http://127.0.0.1:8000`.

Common model IDs (depends on proxy):

- `deepseek/deepseek-v4-pro`
- `deepseek/deepseek-v4-flash`
- `minimax/minimax-m2.7`
- others listed by `GET /v1/models`

### Option B — freebuff-gateway / freebuff-proxy

Follow the project's README. Point Potso-AI at whatever host/port exposes `/v1/chat/completions`.

---

## 2. Configure Potso-AI

```bash
cp .env.example .env.local
```

Set at least:

```env
AI_PROVIDER=freebuff
FREEBUFF_BASE_URL=http://127.0.0.1:8000/v1
FREEBUFF_API_KEY=freebuff
FREEBUFF_MODEL=deepseek/deepseek-v4-pro
```

Keep your existing Firebase / OAuth values.

---

## 3. Run Potso-AI

```bash
npm install
npm run dev
```

- Web: http://localhost:3000  
- API: http://localhost:8080  
- Health: http://localhost:8080/api/health

Send a chat message. You should get multi-agent style reasoning + answer from Freebuff.

---

## 4. Switch back to Gemini anytime

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your-key
```

Restart the server. No code change required.

---

## 5. Troubleshooting

| Symptom | Check |
|--------|--------|
| "Freebuff API 404/connection refused" | Proxy not running, or wrong `FREEBUFF_BASE_URL` (must include `/v1` if the proxy serves under that prefix) |
| Empty / non-JSON answers | Model ignored JSON instructions; try another model or lower temperature (already 0.4). Soft fallback still shows raw text. |
| Auth errors from proxy | Set a valid `FREEBUFF_API_KEY` / Freebuff token as required by your proxy |
| Rate limits / limited mode | Freebuff has regional limits and fair-use constraints |
| Attachments | Freebuff path omits binary attachments (noted in prompt). Prefer text-only while testing. |

---

## Architecture note

```
React UI → Express /api/chat → backend/services/aiService.ts
                                  ├─ freebuff → HTTP OpenAI-compatible proxy → Freebuff models
                                  └─ gemini   → @google/genai SDK
```

`backend/services/geminiService.ts` is a thin re-export for backward compatibility.
