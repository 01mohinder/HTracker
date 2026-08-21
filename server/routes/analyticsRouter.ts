import { Router, Request, Response } from "express";
import { runComprehensiveStatisticalAudit, calculatePearsonCorrelation, computeMarkovForecast } from "../services/analyticsEngine";

export const analyticsRouter = Router();

/**
 * POST /api/analytics/audit
 * Runs the comprehensive mathematical analytics audit on the user's habits
 */
analyticsRouter.post("/audit", async (req: Request, res: Response) => {
  try {
    const { habits, lookbackDays = 30 } = req.body || {};

    if (!Array.isArray(habits)) {
      return res.status(400).json({ error: "Invalid habits payload. Array expected." });
    }

    const auditResult = runComprehensiveStatisticalAudit(habits, Number(lookbackDays) || 30);
    return res.json(auditResult);
  } catch (error: any) {
    console.error("[AnalyticsRouter] Audit Error:", error);
    return res.status(500).json({
      error: "Failed to compute statistical audit",
      details: error?.message || "Internal server error",
    });
  }
});

/**
 * POST /api/analytics/correlations
 * Computes pairwise Pearson correlation between habits
 */
analyticsRouter.post("/correlations", async (req: Request, res: Response) => {
  try {
    const { habitA, habitB, lookbackDays = 60 } = req.body || {};

    if (!habitA?.completions || !habitB?.completions) {
      return res.status(400).json({ error: "Both habitA and habitB must contain completions." });
    }

    const r = calculatePearsonCorrelation(habitA.completions, habitB.completions, Number(lookbackDays) || 60);

    let synergy: "synergistic" | "independent" | "conflicting" = "independent";
    if (r >= 0.35) synergy = "synergistic";
    else if (r <= -0.25) synergy = "conflicting";

    return res.json({
      habitA: habitA.name || "Habit A",
      habitB: habitB.name || "Habit B",
      correlationCoefficient: r,
      synergyType: synergy,
      lookbackDays: Number(lookbackDays) || 60,
    });
  } catch (error: any) {
    console.error("[AnalyticsRouter] Correlation Error:", error);
    return res.status(500).json({
      error: "Failed to compute correlation",
      details: error?.message,
    });
  }
});

/**
 * POST /api/analytics/predict
 * Computes Markov chain continuity and drop-off risk for a specific habit
 */
analyticsRouter.post("/predict", async (req: Request, res: Response) => {
  try {
    const { habit, lookbackDays = 60 } = req.body || {};

    if (!habit || !habit.completions) {
      return res.status(400).json({ error: "Habit object with completions is required." });
    }

    const forecast = computeMarkovForecast(habit, Number(lookbackDays) || 60);
    return res.json({
      habitId: habit.id,
      habitName: habit.name,
      ...forecast,
    });
  } catch (error: any) {
    console.error("[AnalyticsRouter] Prediction Error:", error);
    return res.status(500).json({
      error: "Failed to compute streak prediction",
      details: error?.message,
    });
  }
});
