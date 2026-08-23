import { auditHabitImageLog } from '../../server/services/aiService';

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
    const { imageBase64, habits } = payload;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'imageBase64 string is required.' }),
      };
    }

    const safeHabits = Array.isArray(habits) ? habits.slice(0, 30) : [];
    const audit = await auditHabitImageLog(imageBase64, safeHabits);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(audit),
    };
  } catch (error: any) {
    console.error('[Netlify Vision Error]:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to perform visual audit. Please try again later.',
      }),
    };
  }
};
