# Local Whisper + Piper integration (open source)

Fully offline voice path for Potso — no cloud STT/TTS.

## Target pipeline

```
Browser mic (WAV/WebM)
    → POST /api/voice/stt  → whisper.cpp server (/inference)
    → POST /api/ai/chat    → Ollama / Freebuff
    → POST /api/voice/tts  → Piper HTTP wrapper
    → browser Audio playback (WAV/PCM)
```

Current **Go Live** uses browser Web Speech APIs (free, zero install).
This document is the **optional upgrade** when quality/privacy require local models.

## Components

### 1. whisper.cpp (STT)

```bash
git clone https://github.com/ggml-org/whisper.cpp
cd whisper.cpp && cmake -B build && cmake --build build -j
bash ./models/download-ggml-model.sh base.en
./build/bin/whisper-server -m models/ggml-base.en.bin --host 127.0.0.1 --port 8178
```

Inference:

```bash
curl -X POST http://127.0.0.1:8178/inference \
  -F file=@utterance.wav \
  -F response_format=json
```

| Model | Approx size | Speed | Quality |
|-------|-------------|-------|---------|
| tiny.en | ~75MB | fastest | low |
| base.en | ~150MB | fast | good default |
| small.en | ~500MB | medium | better |

### 2. Piper (TTS)

Piper (OHF-Voice/piper1-gpl successor of rhasspy/piper) is CPU-friendly neural TTS.

Typical wrapper API (community patterns):

- `POST /tts` `{ "text": "..." }` → `audio/wav`
- or WebSocket PCM stream (piper-streaming projects)

Example env:

```env
VOICE_STT_URL=http://127.0.0.1:8178/inference
VOICE_TTS_URL=http://127.0.0.1:5001/tts
VOICE_MODE=local   # browser | local
```

### 3. Potso integration points

| Module | Role |
|--------|------|
| `backend/services/voiceLocal.ts` | HTTP clients for STT/TTS |
| `POST /api/voice/stt` | multipart audio → transcript |
| `POST /api/voice/tts` | text → audio/wav |
| `LiveVoiceModal` | when `VOICE_MODE=local`, record blob → STT → AI → TTS play |

## Latency budget (local, expected)

| Stage | Target P50 |
|-------|------------|
| Capture + encode | 50–100ms |
| Whisper base.en (short utterance) | 200–800ms (CPU) |
| Ollama llama3.2 short answer | 500–3000ms |
| Piper sentence | 50–300ms |
| **Round trip** | **~1–4s** |

Browser Web Speech is often faster TTFA (time-to-first-audio) but lower quality/privacy.

## Recommendation

1. Keep **browser** path as default (zero deps).
2. Add **local** path behind `VOICE_MODE=local` when STT/TTS URLs respond healthy.
3. Prefer **WebSocket PCM** later only if sub-second streaming is required (see WEBRTC.md).
