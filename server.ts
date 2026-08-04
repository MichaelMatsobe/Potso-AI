import express from 'express';
import path from 'path';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import initializeFirebase, { isFirebaseReady } from './backend/config/firebase.js';
import chatRoutes from './backend/routes/chat.js';
import authRoutes from './backend/routes/auth.js';
import aiRoutes from './backend/routes/ai.js';
import voiceRoutes from './backend/routes/voice.js';
import dsarRoutes from './backend/routes/dsar.js';
import adminRoutes from './backend/routes/admin.js';
import {
  getProvider,
  getProviderMode,
  isFreebuffConfigured,
  probeOllama,
  probeFreebuff,
} from './backend/services/aiService.js';
import { isLocalVoiceConfigured, probeLocalVoice } from './backend/services/voiceLocal.js';
import {
  securityHeaders,
  rateLimitMiddleware,
  apiKeyMiddleware,
} from './backend/middleware/accessControl.js';
import { startMaintenanceScheduler } from './backend/services/maintenance.js';

dotenv.config({ path: '.env.local' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

try {
  initializeFirebase();
} catch {
  console.warn('[Server] Firebase init skipped');
}

const allowed = process.env.ALLOWED_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: !allowed || allowed.includes('*') ? true : allowed,
    credentials: true,
  })
);
app.use(securityHeaders);
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

app.get('/api/health', async (_req, res) => {
  const mode = getProviderMode();
  const provider = getProvider();

  const ollama = await probeOllama();
  const freebuffConfigured = isFreebuffConfigured();
  const freebuff = freebuffConfigured
    ? await probeFreebuff()
    : { ok: false, detail: 'not configured' };

  // Hybrid: online if either backend works; single-mode: that backend only
  let aiOnline = false;
  if (mode === 'ollama') aiOnline = ollama.ok;
  else if (mode === 'freebuff') aiOnline = freebuff.ok || ollama.ok;
  else aiOnline = ollama.ok || freebuff.ok;

  const voiceConfigured = isLocalVoiceConfigured();
  const voice = voiceConfigured
    ? await probeLocalVoice()
    : { stt: false, tts: false, detail: 'unconfigured' };

  res.json({
    status: aiOnline ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    aiProvider: provider,
    aiMode: mode,
    hybrid: mode === 'auto' || mode === 'hybrid',
    openSource: ollama.ok || mode === 'ollama' || mode === 'auto',
    noQuota: ollama.ok,
    aiOnline,
    ollama: { ok: ollama.ok, detail: ollama.detail },
    freebuff: {
      configured: freebuffConfigured,
      ok: freebuff.ok,
      detail: freebuff.detail,
    },
    firebaseReady: isFirebaseReady(),
    guestMode: true,
    liveVoiceAvailable: true,
    liveVoiceMode: voice.stt || voice.tts ? 'local+browser-fallback' : 'browser-speech',
    voiceLocal: {
      configured: voiceConfigured,
      sttOnline: voice.stt,
      ttsOnline: voice.tts,
    },
    accessControl: {
      apiKeyRequired: Boolean(process.env.API_ACCESS_KEY),
      rateLimitEnabled: process.env.RATE_LIMIT_DISABLED !== 'true',
    },
    dsar: { enabled: true },
    maintenance: {
      autoPurge: process.env.RETENTION_AUTO_PURGE === 'true',
    },
    paidServices: false,
    endpoints: {
      health: 'GET /api/health',
      aiChat: 'POST /api/ai/chat',
      dsar: 'POST /api/dsar/request',
      adminMaintenance: 'POST /api/admin/maintenance',
    },
  });
});

app.use('/api/ai', rateLimitMiddleware, apiKeyMiddleware, aiRoutes);
app.use('/api/voice', rateLimitMiddleware, apiKeyMiddleware, voiceRoutes);
app.use('/api/dsar', rateLimitMiddleware, dsarRoutes);
app.use('/api/admin', rateLimitMiddleware, adminRoutes);
app.use('/api/auth', rateLimitMiddleware, authRoutes);
app.use('/api/chat', rateLimitMiddleware, apiKeyMiddleware, chatRoutes);

async function startServer() {
  const API_PORT = parseInt(process.env.API_PORT || '8080', 10);
  const isDev = process.env.NODE_ENV !== 'production';

  if (!isDev) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  startMaintenanceScheduler();

  app.listen(API_PORT, '0.0.0.0', () => {
    console.log(`🚀 API  http://localhost:${API_PORT}`);
    console.log(`💚 Health http://localhost:${API_PORT}/api/health`);
    console.log(`📋 DSAR / Admin maintenance enabled`);
    console.log(`🧠 Mode ${getProviderMode()} (label ${getProvider()})`);
    console.log(`🔥 Firebase ${isFirebaseReady() ? 'ready' : 'guest mode'}`);
  });
}

startServer().catch(console.error);
