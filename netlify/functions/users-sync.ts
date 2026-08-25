import { syncUserToMongo } from '../../server/mongodb';
import { syncUserRecord } from '../../server/db';

interface NetlifyEvent {
  httpMethod: string;
  body: string | null;
  headers: Record<string, string | undefined>;
}

export const handler = async (event: NetlifyEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const payload = event.body ? JSON.parse(event.body) : {};
    let { userName, email, uniqueId, id } = payload;

    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Missing or invalid required field: email' }),
      };
    }

    const cleanName = typeof userName === 'string' && userName.trim() ? userName.trim() : 'Champion';
    const targetUniqueId = (uniqueId || id || `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`).trim();

    // 1. Synchronize directly with MongoDB Atlas
    const mongoResult = await syncUserToMongo({
      uniqueId: targetUniqueId,
      email: cleanEmail,
      userName: cleanName,
    });

    // 2. Also keep server DB record updated
    syncUserRecord(cleanName, cleanEmail, { deviceId: targetUniqueId }).catch(() => {});

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        uniqueId: mongoResult.user.uniqueId,
        dateOfFirstJoin: mongoResult.user.dateOfFirstJoin,
        email: mongoResult.user.email,
        userName: mongoResult.user.userName,
        returningVisitors: mongoResult.user.returningVisitors,
        lastActivedate: mongoResult.user.lastActivedate,
        storage: mongoResult.storage,
        message: 'User record successfully synchronized to MongoDB',
      }),
    };
  } catch (error: any) {
    console.error('[Netlify Users Sync Error]:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to sync user data. Please try again later.',
      }),
    };
  }
};

