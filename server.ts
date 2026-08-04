import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import initializeFirebase from "./backend/config/firebase.js";
import chatRoutes from "./backend/routes/chat.js";
import authRoutes from "./backend/routes/auth.js";
import {
  getProvider,
  listOpenSourceModels,
  listFreebuffModels,
} from "./backend/services/aiService.js";

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
    openSource: provider === "ollama",
    noQuota: provider === "ollama",
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/v1",
    ollamaModel: process.env.OLLAMA_MODEL || "llama3.2",
    freebuffBaseUrl: process.env.FREEBUFF_BASE_URL || null,
    openSourceModels: listOpenSourceModels(),
    freebuffModelsOptional: listFreebuffModels(),
    note:
      "Default is Ollama (open-source open weights, self-hosted, no quotas). Freebuff is optional and may have regional limits.",
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
    try {
      const p = getProvider();
      console.log(`🤖 AI provider: ${p} (openSource=${p === "ollama"}, noQuota=${p === "ollama"})`);
    } catch {
      /* ignore */
    }
  });
}

startServer().catch(console.error);
