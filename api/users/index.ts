import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { listUserRecords } from '../../server/db';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const adminSecret = process.env.ADMIN_SECRET_KEY;
    const providedSecret = req.headers['x-admin-key'] || req.headers['x-dev-key'];

    if (!adminSecret || !timingSafeSecretCompare(providedSecret, adminSecret)) {
      return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }

    const data = await listUserRecords();
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('[Vercel Users List Error]:', error);
    return res.status(500).json({ error: 'Failed to fetch user list. Please try again later.' });
  }
}
