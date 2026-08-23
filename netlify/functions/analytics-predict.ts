import { computeMarkovForecast, HabitData } from '../../server/services/analyticsEngine';

interface NetlifyEvent {
  httpMethod: string;
  body: string | null;
}

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

export const handler = async (event: NetlifyEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const payload = event.body ? JSON.parse(event.body) : {};
    const { habit, lookbackDays = 60 } = payload;

    if (!habit) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Habit object is required.' }),
      };
    }

    const safeHabit = sanitizeHabit(habit, 'habit_forecast');
    const safeLookback = Math.max(7, Math.min(365, Math.floor(Number(lookbackDays) || 60)));

    const forecast = computeMarkovForecast(safeHabit, safeLookback);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        habitId: safeHabit.id,
        habitName: safeHabit.name,
        ...forecast,
      }),
    };
  } catch (error: any) {
    console.error('[Netlify Prediction Error]:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to compute streak prediction. Please try again later.',
      }),
    };
  }
};
