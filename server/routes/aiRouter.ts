import { Router, Request, Response } from "express";
import {
  generateHabitCoachAdvice,
  generateRoutineFlow,
  auditHabitImageLog,
  parseNaturalLanguageHabit,
} from "../services/aiService";
import { recordAuditLog } from "../db";

export const aiRouter = Router();

/**
 * POST /api/ai/habit-coach
 * Analyzes active habit stack & stats and generates personalized coach insights
 */
aiRouter.post("/habit-coach", async (req: Request, res: Response) => {
  try {
    const { habits, userStats, userQuery, coachMode, imageBase64, userEmail, deviceId } = req.body || {};

    const result = await generateHabitCoachAdvice({
      habits,
      userStats,
      userQuery,
      coachMode,
      imageBase64,
    });

    if (userEmail) {
      recordAuditLog({
        email: userEmail,
        action: "audit",
        deviceId: deviceId || "web",
        metadata: { coachMode, hasImage: !!imageBase64 },
      }).catch(() => {});
    }

    return res.json(result);
  } catch (error: any) {
    console.error("[AIRouter] Habit Coach Error:", error);
    return res.status(500).json({
      error: "Failed to generate AI habit coaching",
      details: error?.message || "Internal server error",
    });
  }
});

/**
 * POST /api/ai/generate-routine
 * Generates an automated habit stack / routine sequence with energy curves
 */
aiRouter.post("/generate-routine", async (req: Request, res: Response) => {
  try {
    const { goal, timeOfDay, userEmail, deviceId } = req.body || {};
    if (!goal || typeof goal !== "string") {
      return res.status(400).json({ error: "Goal string is required" });
    }

    const routine = await generateRoutineFlow(goal, timeOfDay || "Morning");

    if (userEmail) {
      recordAuditLog({
        email: userEmail,
        action: "routine_gen",
        deviceId: deviceId || "web",
        metadata: { goal, timeOfDay },
      }).catch(() => {});
    }

    return res.json(routine);
  } catch (error: any) {
    console.error("[AIRouter] Routine Generation Error:", error);
    return res.status(500).json({
      error: "Failed to generate routine flow",
      details: error?.message || "Internal server error",
    });
  }
});

/**
 * POST /api/ai/vision-audit
 * Multimodal image verification for workouts, food, or logs
 */
aiRouter.post("/vision-audit", async (req: Request, res: Response) => {
  try {
    const { imageBase64, habits } = req.body || {};

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return res.status(400).json({ error: "imageBase64 string is required." });
    }

    const auditResult = await auditHabitImageLog(imageBase64, Array.isArray(habits) ? habits : []);
    return res.json(auditResult);
  } catch (error: any) {
    console.error("[AIRouter] Vision Audit Error:", error);
    return res.status(500).json({
      error: "Failed to perform visual audit",
      details: error?.message || "Internal server error",
    });
  }
});

/**
 * POST /api/ai/parse-habit
 * Natural language habit parser
 */
aiRouter.post("/parse-habit", async (req: Request, res: Response) => {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required" });
    }

    const habit = await parseNaturalLanguageHabit(text);
    return res.json(habit);
  } catch (error: any) {
    console.error("[AIRouter] Parse Habit Error:", error);
    return res.status(500).json({
      error: "Failed to parse habit text",
      details: error?.message,
    });
  }
});
