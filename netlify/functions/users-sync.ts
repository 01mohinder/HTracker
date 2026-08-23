import { syncUserRecord } from '../../server/db';

interface NetlifyEvent {
  httpMethod: string;
  body: string | null;
  headers: Record<string, string | undefined>;
}

const VALID_DEVICE_TYPES = new Set(['Laptop', 'Mobile', 'Tablet', 'Unknown']);

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
    let { userName, email, deviceId, deviceType, grindScore, totalHabits } = payload;

    const targetEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!targetEmail || !targetEmail.includes('@')) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing or invalid required field: email' }),
      };
    }

    if (!userName || typeof userName !== 'string' || !userName.trim()) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing or invalid required field: userName' }),
      };
    }

    const userAgent = String(event.headers['user-agent'] || 'unknown');
    const safeDeviceType =
      typeof deviceType === 'string' && VALID_DEVICE_TYPES.has(deviceType)
        ? (deviceType as 'Laptop' | 'Mobile' | 'Tablet' | 'Unknown')
        : userAgent.includes('Mobile')
        ? 'Mobile'
        : 'Laptop';

    const cleanGrindScore =
      typeof grindScore === 'number' && Number.isFinite(grindScore)
        ? Math.max(0, Math.min(100, Math.round(grindScore)))
        : undefined;

    const cleanTotalHabits =
      typeof totalHabits === 'number' && Number.isFinite(totalHabits)
        ? Math.max(0, Math.min(500, Math.round(totalHabits)))
        : undefined;

    const cleanDeviceId =
      typeof deviceId === 'string' ? deviceId.slice(0, 100).replace(/[^\w-]/g, '') : undefined;

    const result = await syncUserRecord(userName.trim().slice(0, 100), targetEmail.slice(0, 150), {
      deviceId: cleanDeviceId,
      deviceType: safeDeviceType,
      userAgent: userAgent.slice(0, 200),
      grindScore: cleanGrindScore,
      totalHabits: cleanTotalHabits,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        returningVisitors: result.user.returningVisitors,
        dateOfFirstJoin: result.user.dateOfFirstJoin,
        userName: result.user.userName,
        email: result.user.email,
        storage: result.storage,
        message: result.message,
      }),
    };
  } catch (error: any) {
    console.error('[Netlify Users Sync Error]:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to sync user data. Please try again later.',
      }),
    };
  }
};
