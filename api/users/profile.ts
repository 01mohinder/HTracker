import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserProfile } from '../../server/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const email = typeof req.query.email === 'string' ? req.query.email : '';
    if (!email) {
      return res.status(400).json({ error: 'Email parameter is required.' });
    }

    const profile = await getUserProfile(email);
    if (!profile) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    return res.status(200).json({ user: profile });
  } catch (error: any) {
    console.error('[Vercel Users Profile Error]:', error);
    return res.status(500).json({ error: 'Failed to fetch profile. Please try again later.' });
  }
}
