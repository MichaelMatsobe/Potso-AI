import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import initializeFirebase from "./backend/config/firebase.js";
import chatRoutes from "./backend/routes/chat.js";
import authRoutes from "./backend/routes/auth.js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const API_PORT = parseInt(process.env.API_PORT || "8080", 10);
const isProd = process.env.NODE_ENV === "production";

try {
  initializeFirebase();
} catch (err) {
  console.warn(
    "Firebase init warning (auth/persistence will be limited):",
    (err as Error).message
  );
}

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes("*")) {
        return cb(null, true);
      }
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    firebaseConfigured: Boolean(
      process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL
    ),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

if (isProd) {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err.message);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
);

app.listen(API_PORT, "0.0.0.0", () => {
  console.log(`🚀 Potso API running on http://localhost:${API_PORT}`);
  console.log(`🌍 CORS origins: ${allowedOrigins.join(", ") || "*"}`);
  console.log(
    `🔑 Gemini: ${process.env.GEMINI_API_KEY ? "configured" : "MISSING"}`
  );
});
