import { Router, Request, Response } from "express";
import { generateHabitCoachAdvice, generateRoutineFlow } from "../services/aiService";

export const aiRouter = Router();

/**
 * POST /api/ai/habit-coach
 * Analyzes active habit stack & stats and generates personalized coach insights
 */
aiRouter.post("/habit-coach", async (req: Request, res: Response) => {
  try {
    const { habits, userStats, userQuery, coachMode, imageBase64 } = req.body || {};

    const result = await generateHabitCoachAdvice({
      habits,
      userStats,
      userQuery,
      coachMode,
      imageBase64,
    });

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
 * Generates an automated habit stack / routine sequence from a goal or theme
 */
aiRouter.post("/generate-routine", async (req: Request, res: Response) => {
  try {
    const { goal, timeOfDay } = req.body || {};
    if (!goal || typeof goal !== "string") {
      return res.status(400).json({ error: "Goal string is required" });
    }

    const routine = await generateRoutineFlow(goal, timeOfDay || "Morning");
    return res.json(routine);
  } catch (error: any) {
    console.error("[AIRouter] Routine Generation Error:", error);
    return res.status(500).json({
      error: "Failed to generate routine flow",
      details: error?.message || "Internal server error",
    });
  }
});
