# Ollama + Freebuff as complements

They are **not** exclusive competitors in default mode.

| Piece | Role |
|-------|------|
| **Ollama** | Primary — local, private, open weights, no API quota |
| **Freebuff** | Complement — OpenAI-compatible free hosted models when local is down or unset |

## Modes (`AI_PROVIDER`)

| Value | Behavior |
|-------|----------|
| `auto` / `hybrid` / `both` (**default**) | Try **Ollama** → on failure, try **Freebuff** (if configured) |
| `ollama` | Local only |
| `freebuff` | Freebuff first → Ollama if Freebuff fails |

## Recommended private setup

```env
AI_PROVIDER=auto
OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
OLLAMA_MODEL=llama3.2
# Optional complement:
FREEBUFF_BASE_URL=http://127.0.0.1:8000/v1
FREEBUFF_API_KEY=freebuff
FREEBUFF_MODEL=deepseek/deepseek-v4-pro
```

Responses include `_meta.provider` (`ollama` or `freebuff`) and `_meta.mode` (`primary` or `hybrid-fallback`).
