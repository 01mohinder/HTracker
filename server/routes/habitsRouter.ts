import { Router, Response } from "express";
import { parseNaturalLanguageHabit } from "../services/aiService";
import { optionalAuth, AuthenticatedRequest } from "../middleware/auth";
import { createRateLimiter } from "../middleware/rateLimit";

export const habitsRouter = Router();

const parseHabitLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  message: "Natural language parser quota exceeded. Please wait a minute.",
});

/**
 * POST /api/habits/parse-natural
 * Converts a natural language sentence into a structured, validated Habit model
 */
habitsRouter.post(
  "/parse-natural",
  parseHabitLimiter,
  optionalAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { text } = req.body || {};

      if (!text || typeof text !== "string" || !text.trim()) {
        return res.status(400).json({ error: "Text string is required to parse habit." });
      }

      if (text.length > 1000) {
        return res.status(400).json({ error: "Text exceeds maximum allowed length of 1000 characters." });
      }

      const parsedHabit = await parseNaturalLanguageHabit(text.trim().slice(0, 1000));
      return res.json(parsedHabit);
    } catch (error: any) {
      console.error("[HabitsRouter] Parse Error:", error);
      return res.status(500).json({
        error: "Failed to parse natural language habit. Please try again later.",
      });
    }
  }
);
