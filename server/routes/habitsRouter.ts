import { Router, Request, Response } from "express";
import { parseNaturalLanguageHabit } from "../services/aiService";

export const habitsRouter = Router();

/**
 * POST /api/habits/parse-natural
 * Converts a natural language sentence into a structured, validated Habit model
 */
habitsRouter.post("/parse-natural", async (req: Request, res: Response) => {
  try {
    const { text } = req.body || {};

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Text string is required to parse habit." });
    }

    const parsedHabit = await parseNaturalLanguageHabit(text.trim());
    return res.json(parsedHabit);
  } catch (error: any) {
    console.error("[HabitsRouter] Parse Error:", error);
    return res.status(500).json({
      error: "Failed to parse natural language habit",
      details: error?.message || "Internal server error",
    });
  }
});
