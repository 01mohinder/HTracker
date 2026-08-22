import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateHabitCoachAdvice } from '../../server/services/aiService';

/**
 * Serverless function adapter delegating directly to the canonical aiService implementation.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { habits, userStats, userQuery, coachMode, imageBase64 } = req.body || {};
    const result = await generateHabitCoachAdvice({
      habits,
      userStats,
      userQuery,
      coachMode,
      imageBase64,
    });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[Vercel AI Handler Error]:', error);
    return res.status(500).json({
      error: 'Failed to generate AI advice',
      details: error?.message || 'Unknown error',
    });
  }
}
