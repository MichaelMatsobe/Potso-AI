# Freebuff-first setup (replaces Gemini API key)

**Freebuff is the agent in charge.** Potso-AI does **not** need a Google Gemini API key.

Freebuff is a free CLI coding agent (DeepSeek V4, MiniMax, Kimi, MiMo, GLM, etc.).  
Potso-AI talks to it through a local **OpenAI-compatible proxy** (`/v1/chat/completions`).

---

## Quick test (5 minutes)

### 1. Freebuff proxy

```bash
# Get a Freebuff token
npm install -g freebuff
freebuff   # complete login once
# Token is stored under ~/.config/manicode/credentials.json
# Or use https://freebuff.llm.pm (or your proxy project's token page)
```

Run any OpenAI-compatible Freebuff proxy, for example:

| Proxy | Notes |
|-------|--------|
| [Quorinex/Freebuff2API](https://github.com/Quorinex/Freebuff2API) | Docker-ready, multi-token rotation |
| [XxxXTeam/freebuff2api](https://github.com/XxxXTeam/freebuff2api) | Python / uv |
| freebuff-gateway / freebuff-proxy | Community alternatives |

Point it at port **8000** (or update `FREEBUFF_BASE_URL`).

### 2. Potso-AI

```bash
git checkout dev/freebuff-provider
cp .env.example .env.local
# edit .env.local — at minimum Freebuff + Firebase values
npm install
npm run dev
```

### 3. Verify

```bash
curl -s http://localhost:8080/api/health | jq
```

Expect:

```json
{
  "status": "ok",
  "aiProvider": "freebuff",
  "freebuffBaseUrl": "http://127.0.0.1:8000/v1",
  "freeModels": [ ... catalog ... ],
  "note": "Freebuff is the primary agent. No Gemini API key required."
}
```

Open http://localhost:3000 and send a chat message.

---

## Free model catalog (via Freebuff proxy)

| Model ID | Role |
|----------|------|
| `deepseek/deepseek-v4-pro` | Default — strongest reasoning |
| `deepseek/deepseek-v4-flash` | Faster / limited-mode |
| `minimax/minimax-m2.7` | Speed |
| `moonshotai/kimi-k2.6` | Long context |
| `google/gemini-3.1-flash-lite-preview` | Freebuff-internal Gemini-lite agent path (still no Google key) |

Failover: set `FREEBUFF_FALLBACK_MODELS=deepseek/deepseek-v4-flash,minimax/minimax-m2.7`  
The service tries models in order until one succeeds.

---

## Optional: fully local free (Ollama)

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
OLLAMA_MODEL=llama3.2
```

If Freebuff is down, Potso-AI falls back to Ollama automatically when `OLLAMA_BASE_URL` is set.  
Or force with `AI_PROVIDER=ollama`.

---

## Free CLI landscape (2026) — why Freebuff is primary

| Tool | Truly free inference? | Fits Potso chat API? |
|------|----------------------|----------------------|
| **Freebuff** | Yes (ad-supported frontier models) | Yes via OpenAI proxy |
| OpenCode | Tool free; models usually BYOK (some Zen free models) | Possible with BYOK endpoint |
| Aider | Tool free; needs Ollama or API key | CLI only, not a chat API |
| Goose / Cline | Tool free; BYOK or local | IDE/CLI oriented |
| Gemini CLI / Antigravity | Google free tier (quota / may change) | Different stack; requires Google account |
| Ollama + any agent | Yes if you run models locally | Yes as `/v1` fallback |

**Design choice:** Freebuff remains the agent-in-charge for Potso because it is the only widely available **no-key frontier** stack that community proxies expose as OpenAI chat completions. Other free CLIs are documented here for completeness; they are not required.

---

## Switch back to Gemini (optional)

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=...
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Connection refused | Start Freebuff proxy; check `FREEBUFF_BASE_URL` includes `/v1` |
| 401 / auth | Set valid Freebuff token as `FREEBUFF_API_KEY` / proxy `AUTH_TOKENS` |
| Empty / non-JSON answers | Soft fallback still shows text; try another model in catalog |
| Rate limits | Freebuff limited mode outside supported regions; rotate tokens or use Ollama |
| Attachments | Binary attachments are skipped on Freebuff path |

---

## Architecture

```
UI → Express /api/chat → aiService
                           ├─ freebuff (primary) → local OpenAI-compatible proxy → Freebuff models
                           ├─ ollama (optional auto-fallback)
                           └─ gemini (explicit override only)
```
