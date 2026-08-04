# Open-source AI setup (no quotas)

Potso-AI defaults to **self-hosted open-weight models via Ollama**.

| Requirement | Met by |
|-------------|--------|
| Open source | Yes — Ollama + open weights (Llama, Qwen, Mistral, etc.) |
| No quotas | Yes — runs on your machine; unlimited local use |
| No Gemini API key | Yes |

Freebuff remains **optional**. It is free but not fully open infrastructure and can hit regional/limited mode.

---

## Recommended path (open source + no quotas)

### 1. Install Ollama

https://ollama.com

```bash
ollama pull llama3.2
ollama serve
```

Other open-weight models (pick by RAM):

```bash
ollama pull qwen2.5          # strong general
ollama pull qwen2.5-coder    # code
ollama pull llama3.1
ollama pull mistral
ollama pull phi3             # low RAM
ollama pull gemma2
ollama pull deepseek-r1      # reasoning (larger)
```

### 2. Configure Potso-AI

```bash
git checkout dev/freebuff-provider
cp .env.example .env.local
```

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
OLLAMA_MODEL=llama3.2
# + Firebase / OAuth as before
```

### 3. Run

```bash
npm install
npm run dev
```

### 4. Verify

```bash
curl -s http://localhost:8080/api/health
```

Expect:

```json
{
  "aiProvider": "ollama",
  "openSource": true,
  "noQuota": true,
  "ollamaModel": "llama3.2"
}
```

---

## Open-source CLI agents (ecosystem, optional)

These tools are open source and work with local models (no quotas when paired with Ollama):

| Tool | License | Local models |
|------|---------|--------------|
| [Ollama](https://ollama.com) | MIT | Yes (runtime) |
| [OpenCode](https://github.com/anomalyco/opencode) | MIT | Yes (Ollama / 75+ providers) |
| [Aider](https://github.com/Aider-AI/aider) | Apache-2.0 | Yes (`--model ollama/...`) |
| [Goose](https://github.com/block/goose) | Apache-2.0 | Yes |
| [Cline](https://github.com/cline/cline) | Apache-2.0 | Yes |

Potso-AI uses Ollama’s OpenAI-compatible API directly for chat. You do **not** need Aider/OpenCode for Potso to work — they are separate terminal agents.

---

## Optional: Freebuff (not quota-free)

```env
AI_PROVIDER=freebuff
FREEBUFF_BASE_URL=http://127.0.0.1:8000/v1
FREEBUFF_API_KEY=freebuff
FREEBUFF_MODEL=deepseek/deepseek-v4-pro
```

Requires a Freebuff OpenAI-compatible proxy. Free, but regional limits may apply — **not** the default for “no quotas.”

---

## Optional: Gemini

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=...
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Connection refused to :11434 | Run `ollama serve` |
| Model not found | `ollama pull llama3.2` (or your `OLLAMA_MODEL`) |
| Slow responses | Use smaller models (`phi3`, `llama3.2`); ensure GPU if available |
| Non-JSON answers | Soft fallback still returns text; larger models follow JSON better |
| Out of memory | Switch to `phi3` or quantized variants |

---

## Architecture

```
UI → Express /api/chat → aiService
                           ├─ ollama (default) → localhost:11434 → open-weight models (no quotas)
                           ├─ freebuff (optional) → local proxy → hosted free models
                           └─ gemini (optional) → Google API key
```
