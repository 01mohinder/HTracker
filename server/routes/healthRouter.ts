import { Router, Response } from "express";
import crypto from "crypto";
import { getFirestoreDb } from "../db";
import { optionalAuth, AuthenticatedRequest } from "../middleware/auth";

export const healthRouter = Router();

function timingSafeSecretCompare(provided?: string | string[], actual?: string): boolean {
  if (!provided || !actual) return false;
  const providedStr = Array.isArray(provided) ? provided[0] : provided;
  const bufProvided = Buffer.from(providedStr);
  const bufActual = Buffer.from(actual);

  if (bufProvided.length !== bufActual.length) {
    // Perform dummy timingSafeEqual to neutralize timing differences
    crypto.timingSafeEqual(bufProvided, bufProvided);
    return false;
  }
  return crypto.timingSafeEqual(bufProvided, bufActual);
}

/**
 * GET /api/health
 * Public health check returns minimal status.
 * Detailed process metrics and environment diagnostics are restricted to authenticated admins.
 */
healthRouter.get("/", optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const adminSecret = process.env.ADMIN_SECRET_KEY;
  const providedSecret = req.headers["x-admin-key"] || req.headers["x-dev-key"];
  const isSecretAdmin = Boolean(adminSecret && providedSecret && timingSafeSecretCompare(providedSecret, adminSecret));
  const isAdmin = Boolean(req.user?.isAdmin || isSecretAdmin);

  // Minimal public health check
  if (!isAdmin) {
    return res.json({
      status: "ok",
      service: "HT GRIND",
      timestamp: new Date().toISOString(),
    });
  }

  // Admin-only detailed diagnostics
  const startTime = Date.now();
  const db = await getFirestoreDb();
  const dbLatencyMs = Date.now() - startTime;
  const uptimeSeconds = process.uptime();
  const memory = process.memoryUsage();
  const apiKeyConfigured = Boolean(process.env.GEMINI_API_KEY);

  return res.json({
    status: "ok",
    service: "HT GRIND Backend Engine",
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
      provider: db ? "Cloud Firebase Firestore" : "Local Telemetry Fallback",
      status: db ? "connected" : "in-memory-transient",
      latencyMs: dbLatencyMs,
    },
    aiEngine: {
      provider: "Google Gemini",
      status: apiKeyConfigured ? "ready" : "fallback-enabled",
      multimodalVision: true,
      naturalLanguageParser: true,
    },
  });
});
