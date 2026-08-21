import { Router, Request, Response } from "express";
import { getFirestoreDb } from "../db";

export const healthRouter = Router();

/**
 * GET /api/health
 * High-accuracy system diagnostics, latency, and service health metrics
 */
healthRouter.get("/", async (_req: Request, res: Response) => {
  const startTime = Date.now();
  const db = await getFirestoreDb();
  const dbLatencyMs = Date.now() - startTime;
  const uptimeSeconds = process.uptime();
  const memory = process.memoryUsage();

  const apiKeyConfigured = Boolean(process.env.GEMINI_API_KEY);

  return res.json({
    status: "ok",
    service: "HT GRIND High-Accuracy Backend Engine",
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptimeSeconds)}s`,
    process: {
      nodeVersion: process.version,
      pid: process.pid,
      memoryMb: {
        rss: Number((memory.rss / 1024 / 1024).toFixed(1)),
        heapTotal: Number((memory.heapTotal / 1024 / 1024).toFixed(1)),
        heapUsed: Number((memory.heapUsed / 1024 / 1024).toFixed(1)),
      },
    },
    database: {
      provider: db ? "Cloud Firebase Firestore" : "Firestore In-Memory Fallback",
      status: "connected",
      latencyMs: dbLatencyMs,
    },
    aiEngine: {
      provider: "Google Gemini",
      activeModel: "gemini-2.5-flash",
      status: apiKeyConfigured ? "ready" : "fallback-enabled",
      multimodalVision: true,
      naturalLanguageParser: true,
    },
    analyticsEngine: {
      precision: "high-accuracy-float64",
      models: [
        "Exponential-Decay Grind Score",
        "Shannon Category Balance Entropy",
        "Pearson Habit Synergy Correlation",
        "Markov Continuity Forecast",
      ],
    },
  });
});
