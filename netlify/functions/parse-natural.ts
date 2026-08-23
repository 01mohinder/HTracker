import { parseNaturalLanguageHabit } from '../../server/services/aiService';

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
    const { text } = payload;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Text string is required to parse habit.' }),
      };
    }

    if (text.length > 1000) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Text exceeds maximum allowed length of 1000 characters.' }),
      };
    }

    const parsed = await parseNaturalLanguageHabit(text.trim().slice(0, 1000));
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed),
    };
  } catch (error: any) {
    console.error('[Netlify Parse Natural Error]:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to parse natural language habit. Please try again later.',
      }),
    };
  }
};
