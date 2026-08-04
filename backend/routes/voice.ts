/**
 * Free / open-source local voice routes.
 * STT: whisper.cpp server (VOICE_STT_URL)
 * TTS: Piper HTTP wrapper (VOICE_TTS_URL)
 * Fallback: clients use browser Web Speech when these are down.
 */
import { Router } from 'express';
import {
  isLocalVoiceConfigured,
  probeLocalVoice,
  localStt,
  localTts,
} from '../services/voiceLocal.js';

const router = Router();

router.get('/status', async (_req, res) => {
  const configured = isLocalVoiceConfigured();
  const probe = configured
    ? await probeLocalVoice()
    : { stt: false, tts: false, detail: 'unconfigured' };

  res.json({
    configured,
    mode: configured && (probe.stt || probe.tts) ? 'local' : 'browser',
    stt: {
      configured: Boolean(process.env.VOICE_STT_URL),
      online: probe.stt,
      url: process.env.VOICE_STT_URL || null,
    },
    tts: {
      configured: Boolean(process.env.VOICE_TTS_URL),
      online: probe.tts,
      url: process.env.VOICE_TTS_URL || null,
    },
    detail: probe.detail,
    free: true,
    openSource: true,
  });
});

/**
 * POST /api/voice/stt
 * multipart field "file" (audio/wav, webm, etc.)
 * or JSON { audioBase64, mimeType }
 */
router.post('/stt', async (req, res) => {
  try {
    if (!process.env.VOICE_STT_URL) {
      return res.status(503).json({
        error: 'Local STT not configured',
        hint: 'Set VOICE_STT_URL to whisper.cpp /inference (e.g. http://127.0.0.1:8178/inference)',
        fallback: 'browser-speech',
      });
    }

    let buffer: Buffer | null = null;
    let filename = 'audio.wav';

    // JSON base64 path (browser MediaRecorder)
    if (req.body?.audioBase64) {
      const b64 = String(req.body.audioBase64).replace(/^data:audio\/[^;]+;base64,/, '');
      buffer = Buffer.from(b64, 'base64');
      const mime = String(req.body.mimeType || 'audio/webm');
      filename = mime.includes('wav') ? 'audio.wav' : 'audio.webm';
    }

    // Multipart (express.raw not used; basic busboy-free path via raw body not available)
    // Prefer base64 JSON for browser clients; multipart optional if middleware adds file
    if (!buffer && (req as any).file?.buffer) {
      buffer = (req as any).file.buffer;
      filename = (req as any).file.originalname || filename;
    }

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({
        error: 'audio required',
        hint: 'Send JSON { audioBase64, mimeType } or multipart file',
      });
    }

    if (buffer.length > 15 * 1024 * 1024) {
      return res.status(413).json({ error: 'audio too large (max 15MB)' });
    }

    const text = await localStt(buffer, filename);
    res.json({
      text: String(text || '').trim(),
      provider: 'whisper-local',
      free: true,
      openSource: true,
    });
  } catch (error) {
    console.error('[voice/stt]', error);
    res.status(502).json({
      error: 'STT failed',
      detail: error instanceof Error ? error.message : String(error),
      fallback: 'browser-speech',
    });
  }
});

/**
 * POST /api/voice/tts
 * body: { text: string }
 * returns audio/wav binary or JSON error
 */
router.post('/tts', async (req, res) => {
  try {
    if (!process.env.VOICE_TTS_URL) {
      return res.status(503).json({
        error: 'Local TTS not configured',
        hint: 'Set VOICE_TTS_URL to Piper HTTP endpoint (e.g. http://127.0.0.1:5001/tts)',
        fallback: 'browser-speechSynthesis',
      });
    }

    const text = String(req.body?.text || '').trim();
    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }
    if (text.length > 5000) {
      return res.status(400).json({ error: 'text too long (max 5000 chars)' });
    }

    const audio = await localTts(text);
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('X-Voice-Provider', 'piper-local');
    res.send(Buffer.from(audio));
  } catch (error) {
    console.error('[voice/tts]', error);
    res.status(502).json({
      error: 'TTS failed',
      detail: error instanceof Error ? error.message : String(error),
      fallback: 'browser-speechSynthesis',
    });
  }
});

export default router;
