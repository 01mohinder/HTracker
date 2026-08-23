import { runComprehensiveStatisticalAudit, HabitData } from '../../server/services/analyticsEngine';

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
    const { habits, lookbackDays = 30 } = payload;

    if (!Array.isArray(habits)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid habits payload. Array expected.' }),
      };
    }

    if (habits.length > 50) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Maximum 50 habits allowed for statistical audit.' }),
      };
    }

    const safeLookback = Math.max(1, Math.min(365, Math.floor(Number(lookbackDays) || 30)));
    const sanitizedHabits = habits.slice(0, 50).map((h, i) => sanitizeHabit(h, `habit_${i}`));

    const auditResult = runComprehensiveStatisticalAudit(sanitizedHabits, safeLookback);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auditResult),
    };
  } catch (error: any) {
    console.error('[Netlify Analytics Audit Error]:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to compute statistical audit. Please try again later.',
      }),
    };
  }
};
