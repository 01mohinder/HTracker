import type { VercelRequest, VercelResponse } from '@vercel/node';
import { auditHabitImageLog } from '../../server/services/aiService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64, habits } = req.body || {};
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'imageBase64 string is required.' });
    }

    const safeHabits = Array.isArray(habits) ? habits.slice(0, 30) : [];
    const audit = await auditHabitImageLog(imageBase64, safeHabits);

    return res.status(200).json(audit);
  } catch (error: any) {
    console.error('[Vercel Vision Error]:', error);
    return res.status(500).json({
      error: 'Failed to perform visual audit. Please try again later.',
    });
  }
}
