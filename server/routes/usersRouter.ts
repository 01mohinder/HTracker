import { Router, Request, Response } from "express";
import { syncUserRecord, listUserRecords, getUserProfile, recordAuditLog } from "../db";

export const usersRouter = Router();

/**
 * POST /api/users/sync
 * Syncs user metadata (login count, date of first join, email, username, device telemetry)
 */
usersRouter.post("/sync", async (req: Request, res: Response) => {
  try {
    const { userName, email, deviceId, deviceType, grindScore, totalHabits } = req.body || {};

    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ error: "Missing required field: valid email" });
    }
    if (!userName || typeof userName !== "string" || !userName.trim()) {
      return res.status(400).json({ error: "Missing required field: valid userName" });
    }

    const userAgent = req.headers["user-agent"] || "unknown";

    const result = await syncUserRecord(userName, email, {
      deviceId,
      deviceType: deviceType || (userAgent.includes("Mobile") ? "Mobile" : "Laptop"),
      userAgent,
      grindScore,
      totalHabits,
    });

    recordAuditLog({
      email,
      action: "sync_state",
      deviceId: deviceId || "web",
      metadata: { grindScore, totalHabits },
    }).catch(() => {});

    return res.json({
      ...result.user,
      storage: result.storage,
      message: result.message,
    });
  } catch (error: any) {
    console.error("[UsersRouter] Sync Error:", error);
    return res.status(500).json({
      error: "Failed to sync user data",
      details: error?.message || "Internal server error",
    });
  }
});

/**
 * GET /api/users/profile/:email
 * Gets a user's engagement and telemetry summary
 */
usersRouter.get("/profile/:email", async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ error: "Email parameter is required" });
    }

    const profile = await getUserProfile(email);
    if (!profile) {
      return res.status(404).json({ error: "User record not found" });
    }

    return res.json({ user: profile });
  } catch (error: any) {
    console.error("[UsersRouter] Get Profile Error:", error);
    return res.status(500).json({ error: "Failed to fetch profile", details: error?.message });
  }
});

/**
 * GET /api/users
 * Developer-only user auditing endpoint
 */
usersRouter.get("/", async (req: Request, res: Response) => {
  try {
    const devKey = req.headers["x-dev-key"] || req.query.devKey;
    const userEmail = (req.headers["x-user-email"] || req.query.userEmail || "").toString().toLowerCase();

    const isDeveloperEmail =
      userEmail === "mohinderb321@gmail.com" ||
      userEmail.includes("admin") ||
      userEmail.includes("developer");
    const isValidDevKey = devKey === "dev123" || devKey === "admin123" || isDeveloperEmail;

    if (!isValidDevKey) {
      return res.status(403).json({
        error: "Access Denied: The full Database Registry Table is restricted to Developer Access only.",
      });
    }

    const result = await listUserRecords();
    return res.json(result);
  } catch (error: any) {
    console.error("[UsersRouter] List Error:", error);
    return res.status(500).json({
      error: "Failed to fetch user list",
      details: error?.message || "Internal server error",
    });
  }
});
