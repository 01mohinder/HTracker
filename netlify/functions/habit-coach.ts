import { generateHabitCoachAdvice } from '../../server/services/aiService';

interface NetlifyEvent {
  httpMethod: string;
  body: string | null;
  headers: Record<string, string | undefined>;
}

/**
 * Netlify Function adapter delegating directly to the canonical aiService implementation.
 */
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
    const { habits, userStats, userQuery, coachMode, imageBase64 } = payload;

    const result = await generateHabitCoachAdvice({
      habits,
      userStats,
      userQuery,
      coachMode,
      imageBase64,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (error: any) {
    console.error('[Netlify AI Function Error]:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to generate AI advice',
        details: error?.message || 'Unknown error',
      }),
    };
  }
};
