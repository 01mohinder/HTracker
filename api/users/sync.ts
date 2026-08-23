import type { VercelRequest, VercelResponse } from '@vercel/node';
import { syncUserRecord, getUserProfile } from '../../server/db';

const VALID_DEVICE_TYPES = new Set(['Laptop', 'Mobile', 'Tablet', 'Unknown']);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let { userName, email, deviceId, deviceType, grindScore, totalHabits } = req.body || {};

    const targetEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!targetEmail || !targetEmail.includes('@')) {
      return res.status(400).json({ error: 'Missing or invalid required field: email' });
    }

    if (!userName || typeof userName !== 'string' || !userName.trim()) {
      return res.status(400).json({ error: 'Missing or invalid required field: userName' });
    }

    const userAgent = String(req.headers['user-agent'] || 'unknown');
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

    return res.status(200).json({
      returningVisitors: result.user.returningVisitors,
      dateOfFirstJoin: result.user.dateOfFirstJoin,
      userName: result.user.userName,
      email: result.user.email,
      storage: result.storage,
      message: result.message,
    });
  } catch (error: any) {
    console.error('[Vercel Users Sync Error]:', error);
    return res.status(500).json({
      error: 'Failed to sync user data. Please try again later.',
    });
  }
}
