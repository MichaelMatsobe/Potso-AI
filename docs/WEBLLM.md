# WebLLM (browser-local AI)

Potso can answer **in the browser** with [WebLLM](https://github.com/mlc-ai/web-llm) when the API is down or the device is offline.

## Fallback order

1. **Server** — `POST /api/ai/chat` (Ollama → Freebuff hybrid)
2. **WebLLM** — WebGPU in-tab model (`@mlc-ai/web-llm`)
3. **Template** — static offline copy (`buildOfflineResponse`)

## Requirements

- Chrome / Edge (or other **WebGPU** browser)
- First run downloads a quantized model (can be hundreds of MB)
- `npm install` includes `@mlc-ai/web-llm`

## Config

```env
# default true
VITE_WEBLLM_ENABLED=true
# MLC model id (see WebLLM prebuilt list)
VITE_WEBLLM_MODEL=Llama-3.2-3B-Instruct-q4f16_1-MLC
```

Disable:

```env
VITE_WEBLLM_ENABLED=false
```

## API (client)

```ts
import { preloadWebLLM, onWebLLMProgress, getWebLLMStatus } from './services/webllmClient';

// Optional: warm model on settings open
preloadWebLLM();
onWebLLMProgress(({ progress, text }) => console.log(text, progress));
```

Messages produced by WebLLM set `offline: true` and tag `WebLLM`.

## Notes

- Not a replacement for Ollama quality on desktop — a **privacy / offline complement**.
- Service worker does not precache model weights; WebLLM manages its own cache.
- Mobile support depends on WebGPU availability.
