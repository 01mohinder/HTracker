import { Router, Response } from "express";
import {
  runComprehensiveStatisticalAudit,
  calculatePearsonCorrelation,
  computeMarkovForecast,
  HabitData,
} from "../services/analyticsEngine";
import { optionalAuth, AuthenticatedRequest } from "../middleware/auth";
import { createRateLimiter } from "../middleware/rateLimit";

export const analyticsRouter = Router();

const analyticsLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: "Analytics engine quota exceeded. Please wait a minute.",
});

/**
 * Validates and sanitizes a habit completions object to prevent algorithmic denial of service
 */
function sanitizeCompletions(raw: any): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const clean: Record<string, number> = {};
  const entries = Object.entries(raw).slice(0, 365); // Cap to 1 year of history

  for (const [key, val] of entries) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
      const num = Number(val);
      if (Number.isFinite(num) && num > 0) {
        clean[key] = Math.max(0, Math.min(1000, num));
      }
    }
  }
  return clean;
}

/**
 * Sanitizes a HabitData payload from client
 */
function sanitizeHabit(raw: any, defaultId = "habit"): HabitData {
  return {
    id: typeof raw?.id === "string" ? raw.id.slice(0, 50) : defaultId,
    name: typeof raw?.name === "string" ? raw.name.slice(0, 80) : "Habit",
    category: typeof raw?.category === "string" ? raw.category.slice(0, 40) : "General",
    goal: Math.max(1, Math.min(7, Number(raw?.goal) || 7)),
    completions: sanitizeCompletions(raw?.completions),
  };
}

/**
 * POST /api/analytics/audit
 * Runs the comprehensive mathematical analytics audit on the user's habits
 */
analyticsRouter.post(
  "/audit",
  analyticsLimiter,
  optionalAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { habits, lookbackDays = 30 } = req.body || {};

      if (!Array.isArray(habits)) {
        return res.status(400).json({ error: "Invalid habits payload. Array expected." });
      }

      if (habits.length > 50) {
        return res.status(400).json({ error: "Maximum 50 habits allowed for statistical audit." });
      }

      const safeLookback = Math.max(1, Math.min(365, Math.floor(Number(lookbackDays) || 30)));
      const sanitizedHabits = habits.slice(0, 50).map((h, i) => sanitizeHabit(h, `habit_${i}`));

      const auditResult = runComprehensiveStatisticalAudit(sanitizedHabits, safeLookback);
      return res.json(auditResult);
    } catch (error: any) {
      console.error("[AnalyticsRouter] Audit Error:", error);
      return res.status(500).json({
        error: "Failed to compute statistical audit. Please try again later.",
      });
    }
  }
);

/**
 * POST /api/analytics/correlations
 * Computes pairwise Pearson correlation between habits
 */
analyticsRouter.post(
  "/correlations",
  analyticsLimiter,
  optionalAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { habitA, habitB, lookbackDays = 60 } = req.body || {};

      if (!habitA || !habitB) {
        return res.status(400).json({ error: "Both habitA and habitB are required." });
      }

      const safeHabitA = sanitizeHabit(habitA, "habit_a");
      const safeHabitB = sanitizeHabit(habitB, "habit_b");
      const safeLookback = Math.max(7, Math.min(365, Math.floor(Number(lookbackDays) || 60)));

      const r = calculatePearsonCorrelation(safeHabitA.completions, safeHabitB.completions, safeLookback);

      let synergy: "synergistic" | "independent" | "conflicting" = "independent";
      if (r >= 0.35) synergy = "synergistic";
      else if (r <= -0.25) synergy = "conflicting";

      return res.json({
        habitA: safeHabitA.name,
        habitB: safeHabitB.name,
        correlationCoefficient: r,
        synergyType: synergy,
        lookbackDays: safeLookback,
      });
    } catch (error: any) {
      console.error("[AnalyticsRouter] Correlation Error:", error);
      return res.status(500).json({
        error: "Failed to compute correlation. Please try again later.",
      });
    }
  }
);

/**
 * POST /api/analytics/predict
 * Computes Markov chain continuity and drop-off risk for a specific habit
 */
analyticsRouter.post(
  "/predict",
  analyticsLimiter,
  optionalAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { habit, lookbackDays = 60 } = req.body || {};

      if (!habit) {
        return res.status(400).json({ error: "Habit object is required." });
      }

      const safeHabit = sanitizeHabit(habit, "habit_forecast");
      const safeLookback = Math.max(7, Math.min(365, Math.floor(Number(lookbackDays) || 60)));

      const forecast = computeMarkovForecast(safeHabit, safeLookback);
      return res.json({
        habitId: safeHabit.id,
        habitName: safeHabit.name,
        ...forecast,
      });
    } catch (error: any) {
      console.error("[AnalyticsRouter] Prediction Error:", error);
      return res.status(500).json({
        error: "Failed to compute streak prediction. Please try again later.",
      });
    }
  }
);
