import type { VercelRequest, VercelResponse } from '@vercel/node';
import { computeMarkovForecast, HabitData } from '../../server/services/analyticsEngine';

function sanitizeCompletions(raw: any): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const clean: Record<string, number> = {};
  const entries = Object.entries(raw).slice(0, 365);

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

function sanitizeHabit(raw: any, defaultId = 'habit'): HabitData {
  return {
    id: typeof raw?.id === 'string' ? raw.id.slice(0, 50) : defaultId,
    name: typeof raw?.name === 'string' ? raw.name.slice(0, 80) : 'Habit',
    category: typeof raw?.category === 'string' ? raw.category.slice(0, 40) : 'General',
    goal: Math.max(1, Math.min(7, Number(raw?.goal) || 7)),
    completions: sanitizeCompletions(raw?.completions),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { habit, lookbackDays = 60 } = req.body || {};

    if (!habit) {
      return res.status(400).json({ error: 'Habit object is required.' });
    }

    const safeHabit = sanitizeHabit(habit, 'habit_forecast');
    const safeLookback = Math.max(7, Math.min(365, Math.floor(Number(lookbackDays) || 60)));

    const forecast = computeMarkovForecast(safeHabit, safeLookback);
    return res.status(200).json({
      habitId: safeHabit.id,
      habitName: safeHabit.name,
      ...forecast,
    });
  } catch (error: any) {
    console.error('[Vercel Prediction Error]:', error);
    return res.status(500).json({
      error: 'Failed to compute streak prediction. Please try again later.',
    });
  }
}
