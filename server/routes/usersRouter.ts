import { Router, Response } from "express";
import { syncUserRecord, listUserRecords, getUserProfile, recordAuditLog } from "../db";
import { requireAuth, requireAdmin, optionalAuth, AuthenticatedRequest } from "../middleware/auth";
import { createRateLimiter } from "../middleware/rateLimit";

export const usersRouter = Router();

const syncLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: "Too many profile sync requests. Please try again in a moment.",
});

const VALID_DEVICE_TYPES = new Set(["Laptop", "Mobile", "Tablet", "Unknown"]);

/**
 * POST /api/users/sync
 * Syncs user metadata (login count, date of first join, email, username, device telemetry)
 * Validates authenticated identity to prevent IDOR and account takeover.
 */
usersRouter.post("/sync", syncLimiter, optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    let { userName, email, deviceId, deviceType, grindScore, totalHabits } = req.body || {};

    // Prevent IDOR / Identity Spoofing:
    // If authenticated, email is strictly bound to req.user.email
    if (req.user && req.user.email) {
      email = req.user.email;
      if (!userName && req.user.name) {
        userName = req.user.name;
      }
    } else {
      // For unauthenticated callers, require a guest identifier or require auth to prevent claiming registered accounts
      const targetEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
      if (!targetEmail) {
        return res.status(400).json({ error: "Missing or invalid required field: email" });
      }
      const existing = await getUserProfile(targetEmail);
      if (existing) {
        // Prevent unauthenticated callers from overwriting or modifying an existing registered account
        return res.status(401).json({ error: "Authentication required to update existing user profile." });
      }
    }

    if (!email || typeof email !== "string" || !email.trim() || !email.includes("@")) {
      return res.status(400).json({ error: "Missing or invalid required field: email" });
    }
    if (!userName || typeof userName !== "string" || !userName.trim()) {
      return res.status(400).json({ error: "Missing or invalid required field: userName" });
    }

    const userAgent = String(req.headers["user-agent"] || "unknown");
    const safeDeviceType = typeof deviceType === "string" && VALID_DEVICE_TYPES.has(deviceType)
      ? (deviceType as "Laptop" | "Mobile" | "Tablet" | "Unknown")
      : userAgent.includes("Mobile") ? "Mobile" : "Laptop";

    const cleanGrindScore = typeof grindScore === "number" && Number.isFinite(grindScore)
      ? Math.max(0, Math.min(100, Math.round(grindScore)))
      : undefined;

    const cleanTotalHabits = typeof totalHabits === "number" && Number.isFinite(totalHabits)
      ? Math.max(0, Math.min(500, Math.round(totalHabits)))
      : undefined;

    const cleanDeviceId = typeof deviceId === "string" ? deviceId.slice(0, 100).replace(/[^\w-]/g, "") : undefined;

    const result = await syncUserRecord(userName.trim().slice(0, 100), email.trim().toLowerCase().slice(0, 150), {
      deviceId: cleanDeviceId,
      deviceType: safeDeviceType,
      userAgent: userAgent.slice(0, 200),
      grindScore: cleanGrindScore,
      totalHabits: cleanTotalHabits,
    });

    recordAuditLog({
      email: email.trim().toLowerCase(),
      action: "sync_state",
      deviceId: cleanDeviceId || "web",
      metadata: { grindScore: cleanGrindScore, totalHabits: cleanTotalHabits },
    }).catch(() => {});

    return res.json({
      ...result.user,
      storage: result.storage,
      message: result.message,
    });
  } catch (error: any) {
    console.error("[UsersRouter] Sync Error:", error);
    return res.status(500).json({
      error: "Failed to sync user data. Please try again later.",
    });
  }
});

/**
 * GET /api/users/profile/:email
 * Gets a user's engagement and telemetry summary. Protected: owner or admin only.
 */
usersRouter.get("/profile/:email", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ error: "Email parameter is required" });
    }

    const targetEmail = email.toLowerCase().trim();
    const callerEmail = req.user?.email?.toLowerCase().trim();

    // Prevent IDOR: Caller can only fetch their own profile unless they are an admin
    if (callerEmail !== targetEmail && !req.user?.isAdmin) {
      return res.status(403).json({ error: "Forbidden: You may only view your own user profile." });
    }

    const profile = await getUserProfile(targetEmail);
    if (!profile) {
      return res.status(404).json({ error: "User record not found" });
    }

    return res.json({ user: profile });
  } catch (error: any) {
    console.error("[UsersRouter] Get Profile Error:", error);
    return res.status(500).json({ error: "Failed to fetch profile. Please try again later." });
  }
});

/**
 * GET /api/users
 * Protected: Admin-only registry table
 */
usersRouter.get("/", requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await listUserRecords();
    return res.json(result);
  } catch (error: any) {
    console.error("[UsersRouter] List Error:", error);
    return res.status(500).json({
      error: "Failed to fetch user list. Please try again later.",
    });
  }
});
