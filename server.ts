import express from 'express';
import path from 'path';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import initializeFirebase, { isFirebaseReady } from './backend/config/firebase.js';
import chatRoutes from './backend/routes/chat.js';
import authRoutes from './backend/routes/auth.js';
import aiRoutes from './backend/routes/ai.js';
import {
  getProvider,
  listOpenSourceModels,
  listFreebuffModels,
  probeOllama,
} from './backend/services/aiService.js';

dotenv.config({ path: '.env.local' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

try {
  initializeFirebase();
} catch {
  console.warn('[Server] Firebase init skipped');
}

app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.get('/api/health', async (_req, res) => {
  let provider = 'unknown';
  try {
    provider = getProvider();
  } catch {
    /* ignore */
  }

  let ollama: { ok: boolean; detail?: string } = { ok: false, detail: 'not checked' };
  if (provider === 'ollama') {
    ollama = await probeOllama();
  }

  res.json({
    status: ollama.ok || provider !== 'ollama' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    aiProvider: provider,
    openSource: provider === 'ollama',
    noQuota: provider === 'ollama',
    aiOnline: provider === 'ollama' ? ollama.ok : provider === 'gemini' ? Boolean(process.env.GEMINI_API_KEY) : true,
    ollama,
    firebaseReady: isFirebaseReady(),
    guestMode: true,
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1',
    ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2',
    openSourceModels: listOpenSourceModels(),
    freebuffModelsOptional: listFreebuffModels(),
    liveVoiceAvailable: provider === 'gemini' && Boolean(process.env.GEMINI_API_KEY),
    endpoints: {
      publicAiChat: 'POST /api/ai/chat',
      health: 'GET /api/health',
    },
  });
});

app.use('/api/ai', aiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

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

  app.listen(API_PORT, '0.0.0.0', () => {
    console.log(`🚀 API  http://localhost:${API_PORT}`);
    console.log(`💚 Health http://localhost:${API_PORT}/api/health`);
    console.log(`🤖 AI   POST http://localhost:${API_PORT}/api/ai/chat`);
    try {
      console.log(`🧠 Provider ${getProvider()}`);
    } catch {
      /* ignore */
    }
    console.log(`🔥 Firebase ${isFirebaseReady() ? 'ready' : 'guest mode'}`);
  });
}

startServer().catch(console.error);
