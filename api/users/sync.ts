import type { VercelRequest, VercelResponse } from '@vercel/node';
import { syncUserToMongo } from '../../server/mongodb';
import { syncUserRecord } from '../../server/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let { userName, email, uniqueId, id } = req.body || {};

    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ error: 'Missing or invalid required field: email' });
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

    return res.status(200).json({
      uniqueId: mongoResult.user.uniqueId,
      dateOfFirstJoin: mongoResult.user.dateOfFirstJoin,
      email: mongoResult.user.email,
      userName: mongoResult.user.userName,
      returningVisitors: mongoResult.user.returningVisitors,
      lastActivedate: mongoResult.user.lastActivedate,
      storage: mongoResult.storage,
      message: 'User record successfully synchronized to MongoDB',
    });
  } catch (error: any) {
    console.error('[Vercel Users Sync Error]:', error);
    return res.status(500).json({
      error: 'Failed to sync user data. Please try again later.',
    });
  }
}

