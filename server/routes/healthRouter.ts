import { Router, Request, Response } from "express";
import { getMongoDb } from "../db";

export const healthRouter = Router();

/**
 * GET /api/health
 * System diagnostics and health status
 */
healthRouter.get("/", async (_req: Request, res: Response) => {
  const db = await getMongoDb();
  const uptimeSeconds = process.uptime();

  return res.json({
    status: "ok",
    service: "HT GRIND Backend Engine",
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptimeSeconds)}s`,
    database: {
      provider: db ? "MongoDB Atlas" : "In-Memory Local Fallback",
      status: db ? "connected" : "ready (fallback mode)",
    },
    features: {
      aiHabitCoach: true,
      userRegistry: true,
      firestoreStateSync: "client-direct",
    },
  });
});
