# AI provider setup (free / open source)

Potso-AI defaults to **self-hosted open-weight models via Ollama**.

| Requirement | Met by |
|-------------|--------|
| Open source | Yes — Ollama + open weights |
| No quotas | Yes — local use |
| No Gemini API key | Yes — Gemini is **not** supported on this branch |

Freebuff is **optional** (free hosted proxy; may have regional limits).

## Recommended: Ollama

```bash
ollama pull llama3.2
ollama serve
```

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
OLLAMA_MODEL=llama3.2
```

```bash
npm install && npm run dev
curl -s http://localhost:8080/api/health
```

Expect `aiProvider: "ollama"`, `openSource: true`, `noQuota: true`.

## Optional: Freebuff

```env
AI_PROVIDER=freebuff
FREEBUFF_BASE_URL=http://127.0.0.1:8000/v1
FREEBUFF_API_KEY=freebuff
FREEBUFF_MODEL=deepseek/deepseek-v4-pro
```

## Optional: local voice

```env
VOICE_STT_URL=http://127.0.0.1:8178/inference
VOICE_TTS_URL=http://127.0.0.1:5001/tts
```

See [docs/VOICE_LOCAL.md](./docs/VOICE_LOCAL.md).

## Architecture

```
UI → Express /api/ai/chat → aiService
                           ├─ ollama (default) → open-weight models
                           └─ freebuff (optional) → free proxy

UI → /api/voice/* → whisper.cpp / Piper (optional)
UI → Web Speech API (default voice)
```

## Legal

- [LICENSE](./LICENSE) Apache-2.0
- [TERMS.md](./TERMS.md) · [PRIVACY.md](./PRIVACY.md) · [SECURITY.md](./SECURITY.md)
