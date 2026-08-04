# Local Whisper + Piper (free open source)

Optional upgrade over browser Web Speech. Fully offline when configured.

## API routes (Potso)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/voice/status` | Local STT/TTS readiness |
| POST | `/api/voice/stt` | `{ audioBase64, mimeType }` → `{ text }` |
| POST | `/api/voice/tts` | `{ text }` → `audio/wav` |

When URLs are unset, status reports `mode: browser` and Live Voice uses Web Speech APIs.

## Setup whisper.cpp (STT)

```bash
git clone https://github.com/ggml-org/whisper.cpp
cd whisper.cpp && cmake -B build && cmake --build build -j
bash ./models/download-ggml-model.sh base.en
./build/bin/whisper-server -m models/ggml-base.en.bin --host 127.0.0.1 --port 8178
```

```env
VOICE_STT_URL=http://127.0.0.1:8178/inference
```

## Setup Piper (TTS)

Install a Piper HTTP wrapper (community) or binary + thin server on port 5001.

```env
VOICE_TTS_URL=http://127.0.0.1:5001/tts
```

## Verify

```bash
curl -s http://localhost:8080/api/voice/status
curl -s http://localhost:8080/api/health | jq .voiceLocal
```

## MCP (optional, free open source)

You can expose the same tools via an open-source MCP server for agents/CLI:

- Tool `voice_stt` → POST `/api/voice/stt`
- Tool `voice_tts` → POST `/api/voice/tts`
- Tool `ai_chat` → POST `/api/ai/chat`

No paid MCP hosts required — run locally (e.g. community MCP servers over stdio/HTTP).

## License / cost

| Component | Cost |
|-----------|------|
| whisper.cpp | Free, open source |
| Piper | Free, open source |
| Ollama models | Free, open weights |
| Browser Web Speech | Free (OS) |
| Gemini / paid APIs | **Not used** |
