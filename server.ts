import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import initializeFirebase from "./backend/config/firebase.js";
import chatRoutes from "./backend/routes/chat.js";
import authRoutes from "./backend/routes/auth.js";
import { getProvider, listFreeModels } from "./backend/services/aiService.js";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

initializeFirebase();

app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") || "*" }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.get("/api/health", (req, res) => {
  let provider = "unknown";
  try {
    provider = getProvider();
  } catch {
    /* ignore */
  }
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    aiProvider: provider,
    freebuffBaseUrl: process.env.FREEBUFF_BASE_URL || "http://127.0.0.1:8000/v1",
    freebuffModel: process.env.FREEBUFF_MODEL || "deepseek/deepseek-v4-pro",
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || null,
    freeModels: listFreeModels(),
    note: "Freebuff is the primary agent. No Gemini API key required.",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

async function startServer() {
  const API_PORT = parseInt(process.env.API_PORT || "8080", 10);
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(API_PORT, "0.0.0.0", () => {
    console.log(`🚀 API Server running on http://localhost:${API_PORT}`);
    console.log(`🌍 CORS enabled for: ${process.env.ALLOWED_ORIGINS || "*"}`);
    try {
      console.log(`🤖 AI provider (in charge): ${getProvider()}`);
      console.log(`📋 Free models catalog: ${listFreeModels().map((m) => m.id).join(", ")}`);
    } catch {
      /* ignore */
    }
  });
}

startServer().catch(console.error);
