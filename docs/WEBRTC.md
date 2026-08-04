# WebRTC real-time streaming — investigation

## Question

Should Potso use WebRTC for live voice instead of Web Speech or HTTP STT/TTS?

## Options compared

| Transport | Latency | Browser AEC/NS | Complexity | Fit for local Whisper+Piper |
|-----------|---------|----------------|------------|------------------------------|
| **Web Speech API** (current) | Medium | N/A (OS) | Low | Browser STT/TTS only |
| **WebSocket + PCM** | Low–medium | Manual (getUserMedia constraints) | Medium | Excellent for local servers |
| **WebRTC** | Lowest media path | Built-in AEC/NS/AGC | High (SFU/signaling) | Overkill for 1:1 local AI |

## Findings (2025–2026 industry practice)

1. **WebRTC** is ideal when you need:
   - Sub-500ms media with jitter buffers
   - Built-in echo cancellation for full-duplex
   - Scale beyond one user↔one agent (SFU)
   - PSTN/bridge interop

2. **Local open-source stacks** (whisper.cpp + Ollama + Piper) almost always use:
   - `getUserMedia` → AudioWorklet → **WebSocket PCM16 @ 16kHz**
   - Server VAD → STT window → LLM → TTS chunks → WebSocket back
   - Not full WebRTC, because STT/TTS services speak HTTP/WS, not RTP/Opus SFUs

3. **WebRTC → PCM bridge** (e.g. Cloudflare Realtime, custom SFU) adds ops cost without helping a single-machine Ollama deploy.

## Recommended architecture for Potso

### Phase 0 (shipped)
Browser SpeechRecognition + speechSynthesis + `/api/ai/chat`

### Phase 1 (local quality)
```
Mic → MediaRecorder / AudioWorklet
    → HTTP multipart → whisper-server
    → /api/ai/chat
    → Piper HTTP → Audio element
```

### Phase 2 (streaming, optional)
```
Mic → AudioWorklet (20ms PCM frames)
    → WebSocket /api/voice/stream
    → server VAD + partial Whisper
    → streaming Ollama tokens
    → Piper sentence chunks → WS → AudioWorklet ring buffer
```

Barge-in: on VAD speech-start while TTS playing → cancel TTS queue + abort LLM stream.

### When to add WebRTC

Only if:
- Multi-party voice, or
- Mobile native apps needing peer-style media, or
- Hosted edge SFU with many concurrent sessions

For **local-first open source**, WebSocket + AudioWorklet is the right next step — not WebRTC.

## Latency targets (Phase 2)

| Metric | Target |
|--------|--------|
| Mic → VAD decision | < 50ms |
| STT partial | < 400ms |
| LLM first token | < 500ms (small model) |
| TTS first chunk | < 300ms |
| User-perceived response start | < 1.5s |

## Conclusion

- **Do not** block on WebRTC for Potso local voice.
- **Do** document WebRTC for future multi-user/edge.
- **Do** invest in Whisper/Piper HTTP first, then WS streaming + VAD barge-in.
