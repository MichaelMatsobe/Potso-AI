# Voice (free / open source only)

Potso Live uses **browser Web Speech APIs** + your free AI backend.

```
Mic → SpeechRecognition (browser)
    → POST /api/ai/chat (Ollama or Freebuff)
    → speechSynthesis (browser TTS)
```

- No Gemini
- No paid voice APIs
- No quotas beyond your local machine / Freebuff limits

## Limits

- Best in **Chrome / Edge** (Safari partial)
- Quality depends on the OS voice pack
- **No true barge-in** (stop speaking, then talk again)
- Needs mic permission

## Optional: local STT/TTS (heavier)

For fully offline higher quality later:

| Role | Tool |
|------|------|
| STT | [whisper.cpp](https://github.com/ggerganov/whisper.cpp) or `faster-whisper` |
| TTS | [Piper](https://github.com/rhasspy/piper) or Coqui TTS |

Wire them as local HTTP microservices and point a future `VOICE_STT_URL` / `VOICE_TTS_URL` at them. Not required for current Live mode.
