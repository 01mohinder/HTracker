import { generateRoutineFlow } from '../../server/services/aiService';

interface NetlifyEvent {
  httpMethod: string;
  body: string | null;
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
    const { goal, timeOfDay } = payload;

    if (!goal || typeof goal !== 'string') {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Goal string is required.' }),
      };
    }

    const safeTimeOfDay = ['Morning', 'Afternoon', 'Evening', 'Night', 'All-Day'].includes(timeOfDay)
      ? timeOfDay
      : 'Morning';

    const routine = await generateRoutineFlow(goal.trim().slice(0, 500), safeTimeOfDay);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(routine),
    };
  } catch (error: any) {
    console.error('[Netlify Routine Error]:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to generate routine flow. Please try again later.',
      }),
    };
  }
};
