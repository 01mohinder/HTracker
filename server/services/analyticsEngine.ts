/**
 * HT GRIND High-Precision Mathematical Analytics Engine
 * Provides rigorous statistical computations for:
 * - Exponential decay-weighted Grind Score
 * - Shannon Category Balance Entropy
 * - Habit Synergy & Pearson Correlation Matrix
 * - Markov Transition Probability & Streak Trajectory Forecasting
 * - Burnout Risk & Weekly Velocity Variance
 */

export interface HabitData {
  id: string;
  name: string;
  category: string;
  goal: number;
  completions: Record<string, number>;
  createdAt?: string;
}

export interface StatisticalAuditResult {
  grindScore: number;
  rawScore: number;
  momentumScore: number;
  consistencyIndex: number;
  trend: 'improving' | 'stable' | 'declining';
  burnoutRisk: 'low' | 'moderate' | 'high';
  categoryEntropy: {
    score: number; // 0 to 1
    dominantCategory: string;
    balanceQuality: 'optimal' | 'moderate' | 'unbalanced';
    distribution: Record<string, number>;
  };
  weeklyVelocity: {
    averagePerDay: number;
    peakDay: string;
    lowestDay: string;
    weekdayDistribution: Array<{ day: string; count: number; percentage: number }>;
  };
  topCorrelations: Array<{
    habitA: string;
    habitB: string;
    correlationCoefficient: number;
    synergyType: 'synergistic' | 'independent' | 'conflicting';
    insight: string;
  }>;
  forecasts: Array<{
    habitId: string;
    name: string;
    currentStreak: number;
    sevenDayProbability: number;
    thirtyDayProbability: number;
    riskFactor: 'low' | 'moderate' | 'high';
  }>;
}

/**
 * Formats a Date object to YYYY-MM-DD
 */
function toDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates consecutive active streak for a single habit
 */
export function calculatePreciseStreak(completions?: Record<string, number>): number {
  const comps = completions || {};
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check today first
  const todayKey = toDateKey(today);
  const completedToday = (comps[todayKey] || 0) > 0;

  let checkDate = new Date(today);
  if (!completedToday) {
    // Check if completed yesterday to maintain ongoing streak
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const key = toDateKey(checkDate);
    if ((comps[key] || 0) > 0) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Computes Pearson Correlation Coefficient between two habits over N days
 * r = (N * Σxy - ΣxΣy) / sqrt([NΣx² - (Σx)²][NΣy² - (Σy)²])
 */
export function calculatePearsonCorrelation(
  completionsA?: Record<string, number>,
  completionsB?: Record<string, number>,
  lookbackDays = 60
): number {
  const compsA = completionsA || {};
  const compsB = completionsB || {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let n = lookbackDays;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < lookbackDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = toDateKey(d);

    const x = (compsA[key] || 0) > 0 ? 1 : 0;
    const y = (compsB[key] || 0) > 0 ? 1 : 0;

    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0 || isNaN(denominator)) {
    return 0;
  }

  const r = numerator / denominator;
  return Number(Math.max(-1, Math.min(1, r)).toFixed(3));
}

/**
 * Computes Shannon Diversity Index (Category Balance Entropy)
 * H = - Σ (p_i * ln(p_i)) / ln(K)
 */
export function calculateCategoryEntropy(habits: HabitData[], lookbackDays = 30): {
  score: number;
  dominantCategory: string;
  balanceQuality: 'optimal' | 'moderate' | 'unbalanced';
  distribution: Record<string, number>;
} {
  const categoryCounts: Record<string, number> = {};
  let totalCompletions = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const safeHabits = Array.isArray(habits) ? habits : [];

  safeHabits.forEach((habit) => {
    if (!habit) return;
    const comps = habit.completions || {};
    const cat = habit.category || 'General';
    if (!categoryCounts[cat]) categoryCounts[cat] = 0;

    for (let i = 0; i < lookbackDays; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = toDateKey(d);
      const count = comps[key] || 0;
      if (count > 0) {
        categoryCounts[cat] += count;
        totalCompletions += count;
      }
    }
  });

  const categories = Object.keys(categoryCounts);
  if (totalCompletions === 0 || categories.length === 0) {
    return {
      score: 1,
      dominantCategory: 'None',
      balanceQuality: 'optimal',
      distribution: {},
    };
  }

  // Calculate Shannon index
  let entropy = 0;
  let dominantCategory = categories[0];
  let maxCount = 0;

  categories.forEach((cat) => {
    const count = categoryCounts[cat];
    if (count > maxCount) {
      maxCount = count;
      dominantCategory = cat;
    }
    const p = count / totalCompletions;
    if (p > 0) {
      entropy -= p * Math.log(p);
    }
  });

  const maxPossibleEntropy = Math.log(Math.max(categories.length, 2));
  const normalizedEntropy = Number((entropy / maxPossibleEntropy).toFixed(2));

  let balanceQuality: 'optimal' | 'moderate' | 'unbalanced' = 'optimal';
  if (normalizedEntropy < 0.5) balanceQuality = 'unbalanced';
  else if (normalizedEntropy < 0.8) balanceQuality = 'moderate';

  return {
    score: Math.min(1, Math.max(0, normalizedEntropy)),
    dominantCategory,
    balanceQuality,
    distribution: categoryCounts,
  };
}

/**
 * Computes Markov Transition Probability & Streak Continuity Forecasting
 */
export function computeMarkovForecast(
  habit: HabitData,
  lookbackDays = 60
): {
  sevenDayProbability: number;
  thirtyDayProbability: number;
  riskFactor: 'low' | 'moderate' | 'high';
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const comps = habit?.completions || {};
  let successAfterSuccess = 0;
  let totalSuccess = 0;
  let recentCompletions14d = 0;

  for (let i = 1; i < lookbackDays; i++) {
    const dPrev = new Date(today);
    dPrev.setDate(dPrev.getDate() - i);
    const prevKey = toDateKey(dPrev);

    const dNext = new Date(today);
    dNext.setDate(dNext.getDate() - (i - 1));
    const nextKey = toDateKey(dNext);

    const completedPrev = (comps[prevKey] || 0) > 0;
    const completedNext = (comps[nextKey] || 0) > 0;

    if (completedPrev) {
      totalSuccess++;
      if (completedNext) successAfterSuccess++;
    }

    if (i <= 14 && completedPrev) {
      recentCompletions14d++;
    }
  }

  // Base transition probability P(Success_t+1 | Success_t)
  const pTransition = totalSuccess > 0 ? successAfterSuccess / totalSuccess : 0.6;
  const recentFrequency = recentCompletions14d / 14;

  // Blended continuity coefficient
  const continuityIndex = Math.min(0.98, Math.max(0.1, 0.6 * pTransition + 0.4 * recentFrequency));

  // 7-day projected streak continuity = (continuityIndex)^7 with decay dampening
  const sevenDayProb = Math.round(Math.pow(continuityIndex, 2.5) * 100);
  const thirtyDayProb = Math.round(Math.pow(continuityIndex, 6.0) * 100);

  let riskFactor: 'low' | 'moderate' | 'high' = 'low';
  if (sevenDayProb < 45) riskFactor = 'high';
  else if (sevenDayProb < 75) riskFactor = 'moderate';

  return {
    sevenDayProbability: Math.min(99, Math.max(5, sevenDayProb)),
    thirtyDayProbability: Math.min(95, Math.max(2, thirtyDayProb)),
    riskFactor,
  };
}

/**
 * Runs a comprehensive statistical audit on the habit tracking dataset
 */
export function runComprehensiveStatisticalAudit(
  habits: HabitData[],
  lookbackDays = 30
): StatisticalAuditResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const safeHabits = (Array.isArray(habits) ? habits : []).filter(Boolean).map((h) => ({
    ...h,
    completions: h.completions || {},
  }));

  if (safeHabits.length === 0) {
    return {
      grindScore: 100,
      rawScore: 100,
      momentumScore: 100,
      consistencyIndex: 100,
      trend: 'stable',
      burnoutRisk: 'low',
      categoryEntropy: {
        score: 1,
        dominantCategory: 'General',
        balanceQuality: 'optimal',
        distribution: {},
      },
      weeklyVelocity: {
        averagePerDay: 0,
        peakDay: 'Monday',
        lowestDay: 'Sunday',
        weekdayDistribution: [],
      },
      topCorrelations: [],
      forecasts: [],
    };
  }

  // 1. Compute Day-by-Day Exponential Decay Weighted Grind Score
  let weightedSum = 0;
  let maxPossibleWeightedSum = 0;
  let recent7dCompletions = 0;
  let prev7dCompletions = 0;

  // Day of week distribution counts
  const dowCounts = [0, 0, 0, 0, 0, 0, 0]; // Mon (0) to Sun (6)
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  for (let i = 0; i < lookbackDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = toDateKey(d);

    // Exponential decay weight w_i = e^(-0.04 * i)
    const weight = Math.exp(-0.04 * i);

    let dayCompletions = 0;
    safeHabits.forEach((h) => {
      const comps = h.completions || {};
      const count = comps[key] || 0;
      if (count > 0) {
        dayCompletions++;
      }
    });

    weightedSum += Math.min(dayCompletions, safeHabits.length) * weight;
    maxPossibleWeightedSum += safeHabits.length * weight;

    if (i < 7) {
      recent7dCompletions += dayCompletions;
    } else if (i < 14) {
      prev7dCompletions += dayCompletions;
    }

    let dow = d.getDay() - 1;
    if (dow < 0) dow = 6;
    dowCounts[dow] += dayCompletions;
  }

  const rawScore = maxPossibleWeightedSum > 0 ? (weightedSum / maxPossibleWeightedSum) * 100 : 85;
  const entropyResult = calculateCategoryEntropy(safeHabits, lookbackDays);

  // Calibrate score with entropy balance factor
  const entropyAdjustment = 0.85 + 0.15 * entropyResult.score;
  const calibratedScore = Math.min(100, Math.max(5, Math.round(rawScore * entropyAdjustment)));

  // Momentum score (recent 7 days vs previous 7 days)
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  let momentumScore = 50;
  if (prev7dCompletions > 0) {
    const velocityRatio = recent7dCompletions / prev7dCompletions;
    momentumScore = Math.min(100, Math.max(0, Math.round(velocityRatio * 50)));
    if (velocityRatio > 1.15) trend = 'improving';
    else if (velocityRatio < 0.85) trend = 'declining';
  } else if (recent7dCompletions > 0) {
    trend = 'improving';
    momentumScore = 80;
  }

  // Burnout risk detection: Extreme velocity spikes followed by drop-offs or over 10 logs/day
  let burnoutRisk: 'low' | 'moderate' | 'high' = 'low';
  const avgLogsPerDay = recent7dCompletions / 7;
  if (avgLogsPerDay > 8 && entropyResult.score < 0.4) {
    burnoutRisk = 'high';
  } else if (avgLogsPerDay > 6 || (trend === 'declining' && prev7dCompletions > 15)) {
    burnoutRisk = 'moderate';
  }

  // Weekday velocity analysis
  let maxDow = 0;
  let minDow = 999999;
  let peakDay = dayNames[0];
  let lowestDay = dayNames[6];
  const totalDowSum = dowCounts.reduce((a, b) => a + b, 0);

  const weekdayDistribution = dayNames.map((name, idx) => {
    const count = dowCounts[idx];
    if (count > maxDow) {
      maxDow = count;
      peakDay = name;
    }
    if (count < minDow) {
      minDow = count;
      lowestDay = name;
    }
    return {
      day: name,
      count,
      percentage: totalDowSum > 0 ? Math.round((count / totalDowSum) * 100) : 0,
    };
  });

  // Habit Correlations (top 5 pairs)
  const correlations: Array<{
    habitA: string;
    habitB: string;
    correlationCoefficient: number;
    synergyType: 'synergistic' | 'independent' | 'conflicting';
    insight: string;
  }> = [];

  for (let a = 0; a < safeHabits.length; a++) {
    for (let b = a + 1; b < safeHabits.length; b++) {
      const r = calculatePearsonCorrelation(safeHabits[a].completions, safeHabits[b].completions, 60);
      let synergyType: 'synergistic' | 'independent' | 'conflicting' = 'independent';
      let insight = 'No strong correlation detected.';

      if (r >= 0.4) {
        synergyType = 'synergistic';
        insight = `Completing "${safeHabits[a].name}" significantly increases the likelihood of completing "${safeHabits[b].name}" (+${Math.round(r * 100)}% synergy).`;
      } else if (r <= -0.3) {
        synergyType = 'conflicting';
        insight = `Time or energy conflict: completing "${safeHabits[a].name}" correlates with lower completion of "${safeHabits[b].name}".`;
      }

      if (Math.abs(r) >= 0.25) {
        correlations.push({
          habitA: safeHabits[a].name,
          habitB: safeHabits[b].name,
          correlationCoefficient: r,
          synergyType,
          insight,
        });
      }
    }
  }

  correlations.sort((x, y) => Math.abs(y.correlationCoefficient) - Math.abs(x.correlationCoefficient));

  // Forecasts for each habit
  const forecasts = safeHabits.slice(0, 10).map((h) => {
    const streak = calculatePreciseStreak(h.completions);
    const forecast = computeMarkovForecast(h, 60);
    return {
      habitId: h.id,
      name: h.name,
      currentStreak: streak,
      ...forecast,
    };
  });

  return {
    grindScore: calibratedScore,
    rawScore: Math.round(rawScore),
    momentumScore,
    consistencyIndex: Math.min(100, Math.round((recent7dCompletions / (safeHabits.length * 7 || 1)) * 100)),
    trend,
    burnoutRisk,
    categoryEntropy: entropyResult,
    weeklyVelocity: {
      averagePerDay: Number(avgLogsPerDay.toFixed(1)),
      peakDay,
      lowestDay,
      weekdayDistribution,
    },
    topCorrelations: correlations.slice(0, 5),
    forecasts,
  };
}
