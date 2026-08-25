import { Router, Response } from "express";
import { syncUserToMongo, getMongoUserByEmail, listMongoUsers } from "../mongodb";
import { syncUserRecord, recordAuditLog } from "../db";
import { requireAuth, requireAdmin, optionalAuth, AuthenticatedRequest } from "../middleware/auth";
import { createRateLimiter } from "../middleware/rateLimit";

export const usersRouter = Router();

const syncLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: "Too many profile sync requests. Please try again in a moment.",
});

/**
 * POST /api/users/sync
 * Syncs user data directly to MongoDB (storing strictly: uniqueId, dateOfFirstJoin, email, userName, returningVisitors, lastActivedate)
 */
usersRouter.post("/sync", syncLimiter, optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    let { userName, email, uniqueId, id } = req.body || {};

    // If authenticated via Firebase token, email & uid are securely bound
    if (req.user && req.user.email) {
      email = req.user.email;
      if (!userName && req.user.name) {
        userName = req.user.name;
      }
      if (!uniqueId && req.user.uid) {
        uniqueId = req.user.uid;
      }
    }

    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return res.status(400).json({ error: "Missing or invalid required field: email" });
    }

    const cleanName = typeof userName === "string" && userName.trim() ? userName.trim() : "Champion";
    const targetUniqueId = (uniqueId || id || req.user?.uid || "").trim();

    // Synchronize directly with MongoDB
    const mongoResult = await syncUserToMongo({
      uniqueId: targetUniqueId,
      email: cleanEmail,
      userName: cleanName,
    });

    // Also update server cache & audit logs
    syncUserRecord(cleanName, cleanEmail).catch(() => {});
    recordAuditLog({
      email: cleanEmail,
      action: "sync_state",
      deviceId: targetUniqueId || "web",
      metadata: { returningVisitors: mongoResult.user.returningVisitors },
    }).catch(() => {});

    // Return the clean user data
    return res.json({
      uniqueId: mongoResult.user.uniqueId,
      dateOfFirstJoin: mongoResult.user.dateOfFirstJoin,
      email: mongoResult.user.email,
      userName: mongoResult.user.userName,
      returningVisitors: mongoResult.user.returningVisitors,
      lastActivedate: mongoResult.user.lastActivedate,
      storage: mongoResult.storage,
      message: "User record successfully synchronized to MongoDB",
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
 * Gets a user's MongoDB record. Protected: owner or admin only.
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

    const profile = await getMongoUserByEmail(targetEmail);
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
 * Protected: Admin-only registry table fetched from MongoDB
 */
usersRouter.get("/", requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await listMongoUsers();
    return res.json({
      users,
      count: users.length,
      storage: "MongoDB",
    });
  } catch (error: any) {
    console.error("[UsersRouter] List Error:", error);
    return res.status(500).json({
      error: "Failed to fetch user list. Please try again later.",
    });
  }
});
