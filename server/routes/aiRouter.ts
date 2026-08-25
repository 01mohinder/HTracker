import { Router, Response } from "express";
import {
  generateHabitCoachAdvice,
  generateRoutineFlow,
  auditHabitImageLog,
  parseNaturalLanguageHabit,
} from "../services/aiService";
import { recordAuditLog } from "../db";
import { optionalAuth, AuthenticatedRequest } from "../middleware/auth";
import { createRateLimiter } from "../middleware/rateLimit";

export const aiRouter = Router();

// General AI Rate Limiter (20 requests per minute per user/IP)
const aiGeneralLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  message: "AI coaching quota exceeded. Please wait a minute before requesting more insights.",
});

// Stricter Rate Limiter for Multimodal Vision (6 requests per minute per user/IP)
const aiVisionLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 6,
  message: "AI Vision Audit quota exceeded. Please wait a minute before analyzing more images.",
});

// Maximum allowed base64 size: ~4 MB raw image data (~5.5 MB base64 string)
const MAX_IMAGE_BASE64_LENGTH = 5.5 * 1024 * 1024;

function sanitizeDeviceId(id: any): string {
  if (typeof id !== "string") return "web";
  return id.replace(/[^a-zA-Z0-9_\-.:]/g, "").slice(0, 64) || "web";
}

/**
 * POST /api/ai/habit-coach
 * Analyzes active habit stack & stats and generates personalized coach insights
 */
aiRouter.post(
  "/habit-coach",
  aiGeneralLimiter,
  optionalAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { habits, userStats, userQuery, coachMode, imageBase64, deviceId } = req.body || {};

      // Input Validation
      if (userQuery && typeof userQuery === "string" && userQuery.length > 2000) {
        return res.status(400).json({ error: "userQuery exceeds maximum allowed length of 2000 characters" });
      }

      if (habits && (!Array.isArray(habits) || habits.length > 50)) {
        return res.status(400).json({ error: "habits must be an array of at most 50 items" });
      }

      if (imageBase64) {
        if (typeof imageBase64 !== "string" || imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
          return res.status(400).json({ error: "imageBase64 exceeds maximum allowed size (4MB)" });
        }
      }

      // Bind userEmail strictly to verified authenticated token to prevent audit log forgery
      const userEmail = req.user?.email;

      const result = await generateHabitCoachAdvice({
        habits,
        userStats,
        userQuery: typeof userQuery === "string" ? userQuery.slice(0, 2000) : undefined,
        coachMode: ["high-performance", "neuroscience", "mindful"].includes(coachMode) ? coachMode : "high-performance",
        imageBase64,
      });

      if (userEmail) {
        recordAuditLog({
          email: userEmail,
          action: "audit",
          deviceId: sanitizeDeviceId(deviceId),
          metadata: { coachMode, hasImage: !!imageBase64 },
        }).catch(() => {});
      }

      return res.json(result);
    } catch (error: any) {
      console.error("[AIRouter] Habit Coach Error:", error);
      return res.status(500).json({
        error: "Failed to generate AI habit coaching. Please try again later.",
      });
    }
  }
);

/**
 * POST /api/ai/generate-routine
 * Generates an automated habit stack / routine sequence with energy curves
 */
aiRouter.post(
  "/generate-routine",
  aiGeneralLimiter,
  optionalAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { goal, timeOfDay, deviceId } = req.body || {};
      if (!goal || typeof goal !== "string" || !goal.trim()) {
        return res.status(400).json({ error: "Valid goal string is required" });
      }

      if (goal.length > 500) {
        return res.status(400).json({ error: "goal exceeds maximum allowed length of 500 characters" });
      }

      const safeTimeOfDay = ["Morning", "Afternoon", "Evening", "Night", "All-Day"].includes(timeOfDay)
        ? timeOfDay
        : "Morning";

      const routine = await generateRoutineFlow(goal.trim().slice(0, 500), safeTimeOfDay);

      const userEmail = req.user?.email;
      if (userEmail) {
        recordAuditLog({
          email: userEmail,
          action: "routine_gen",
          deviceId: sanitizeDeviceId(deviceId),
          metadata: { goal: goal.slice(0, 100), timeOfDay: safeTimeOfDay },
        }).catch(() => {});
      }

      return res.json(routine);
    } catch (error: any) {
      console.error("[AIRouter] Routine Generation Error:", error);
      return res.status(500).json({
        error: "Failed to generate routine flow. Please try again later.",
      });
    }
  }
);

/**
 * POST /api/ai/vision-audit
 * Multimodal image verification for workouts, food, or logs
 */
aiRouter.post(
  "/vision-audit",
  aiVisionLimiter,
  optionalAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { imageBase64, habits } = req.body || {};

      if (!imageBase64 || typeof imageBase64 !== "string") {
        return res.status(400).json({ error: "imageBase64 string is required." });
      }

      if (imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
        return res.status(400).json({ error: "Image size exceeds maximum limit (4MB)." });
      }

      const safeHabits = Array.isArray(habits) ? habits.slice(0, 30) : [];
      const auditResult = await auditHabitImageLog(imageBase64, safeHabits);
      return res.json(auditResult);
    } catch (error: any) {
      console.error("[AIRouter] Vision Audit Error:", error);
      return res.status(500).json({
        error: "Failed to perform visual audit. Please try again later.",
      });
    }
  }
);

/**
 * POST /api/ai/parse-habit
 * Natural language habit parser
 */
aiRouter.post(
  "/parse-habit",
  aiGeneralLimiter,
  optionalAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { text } = req.body || {};
      if (!text || typeof text !== "string" || !text.trim()) {
        return res.status(400).json({ error: "Text string is required" });
      }

      if (text.length > 1000) {
        return res.status(400).json({ error: "text exceeds maximum length of 1000 characters" });
      }

      const habit = await parseNaturalLanguageHabit(text.trim().slice(0, 1000));
      return res.json(habit);
    } catch (error: any) {
      console.error("[AIRouter] Parse Habit Error:", error);
      return res.status(500).json({
        error: "Failed to parse habit text. Please try again later.",
      });
    }
  }
);
