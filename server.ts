import express from "express";
import path from "path";
import cors from "cors";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import initializeFirebase from "./backend/config/firebase.js";
import chatRoutes from "./backend/routes/chat.js";
import authRoutes from "./backend/routes/auth.js";

dotenv.config({ path: ".env.local" });
dotenv.config(); // also load .env if present

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Initialize Firebase (graceful if missing credentials)
initializeFirebase();

// Middleware
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()) || true,
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    firebaseConfigured: Boolean(
      process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL
    ),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

async function startServer() {
  const API_PORT = parseInt(process.env.API_PORT || "8080", 10);
  const isProd = process.env.NODE_ENV === "production";

  // In production, serve the built Vite frontend from the same process
  if (isProd) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(API_PORT, "0.0.0.0", () => {
    console.log(`🚀 API Server running on http://localhost:${API_PORT}`);
    console.log(`🌍 CORS: ${process.env.ALLOWED_ORIGINS || "all origins"}`);
    console.log(
      `🔑 Gemini: ${process.env.GEMINI_API_KEY ? "configured" : "MISSING — set GEMINI_API_KEY"}`
    );
  });
}

startServer().catch(console.error);
