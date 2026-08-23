import { getUserProfile } from '../../server/db';

interface NetlifyEvent {
  httpMethod: string;
  queryStringParameters?: Record<string, string | undefined>;
  headers: Record<string, string | undefined>;
}

export const handler = async (event: NetlifyEvent) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const email = event.queryStringParameters?.email || '';
    if (!email) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Email parameter is required.' }),
      };
    }

    const profile = await getUserProfile(email);
    if (!profile) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'User profile not found.' }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: profile }),
    };
  } catch (error: any) {
    console.error('[Netlify Users Profile Error]:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to fetch profile. Please try again later.' }),
    };
  }
};
