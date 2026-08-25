import crypto from 'crypto';
import { listUserRecords } from '../../server/db';

interface NetlifyEvent {
  httpMethod: string;
  headers: Record<string, string | undefined>;
}

function timingSafeSecretCompare(provided?: string | string[], actual?: string): boolean {
  if (!provided || !actual) return false;
  const providedStr = Array.isArray(provided) ? provided[0] : provided;
  const bufProvided = Buffer.from(providedStr);
  const bufActual = Buffer.from(actual);

  if (bufProvided.length !== bufActual.length) {
    crypto.timingSafeEqual(bufProvided, bufProvided);
    return false;
  }
  return crypto.timingSafeEqual(bufProvided, bufActual);
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
    const adminSecret = process.env.ADMIN_SECRET_KEY;
    const providedSecret = event.headers['x-admin-key'] || event.headers['x-dev-key'];

    if (!adminSecret || !timingSafeSecretCompare(providedSecret, adminSecret)) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Forbidden: Admin access required.' }),
      };
    }

    const data = await listUserRecords();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (error: any) {
    console.error('[Netlify Users List Error]:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to fetch user list. Please try again later.' }),
    };
  }
};
