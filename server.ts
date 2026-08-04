import express from 'express';
import { createServer as createViteServer } from 'vite';
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
} from './backend/services/aiService.js';

dotenv.config({ path: '.env.local' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Best-effort Firebase (guest mode works without it)
try {
  initializeFirebase();
} catch (e) {
  console.warn('[Server] Firebase init skipped');
}

app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/api/health', (_req, res) => {
  let provider = 'unknown';
  try {
    provider = getProvider();
  } catch {
    /* ignore */
  }
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    aiProvider: provider,
    openSource: provider === 'ollama',
    noQuota: provider === 'ollama',
    firebaseReady: isFirebaseReady(),
    guestMode: true,
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1',
    ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2',
    openSourceModels: listOpenSourceModels(),
    freebuffModelsOptional: listFreebuffModels(),
    endpoints: {
      publicAiChat: 'POST /api/ai/chat',
      health: 'GET /api/health',
      auth: '/api/auth/* (requires Firebase)',
      chats: '/api/chat/* (requires Firebase)',
    },
  });
});

// Public AI (no auth) — primary path for web guest + mobile guest
app.use('/api/ai', aiRoutes);

// Auth + persisted chats (optional Firebase)
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

async function startServer() {
  const API_PORT = parseInt(process.env.API_PORT || '8080', 10);
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    // In dev, Vite runs separately on :3000 (npm run dev:web).
    // This process is API-only so CORS + separate ports work cleanly.
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(API_PORT, '0.0.0.0', () => {
    console.log(`🚀 API Server http://localhost:${API_PORT}`);
    console.log(`💚 Health    http://localhost:${API_PORT}/api/health`);
    console.log(`🤖 Public AI POST http://localhost:${API_PORT}/api/ai/chat`);
    try {
      const p = getProvider();
      console.log(`🧠 Provider  ${p} (openSource=${p === 'ollama'})`);
    } catch {
      /* ignore */
    }
    console.log(`🔥 Firebase  ${isFirebaseReady() ? 'ready' : 'guest mode (not configured)'}`);
  });
}

startServer().catch(console.error);
