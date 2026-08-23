import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateRoutineFlow } from '../../server/services/aiService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { goal, timeOfDay } = req.body || {};
    if (!goal || typeof goal !== 'string') {
      return res.status(400).json({ error: 'Goal string is required.' });
    }

    const safeTimeOfDay = ['Morning', 'Afternoon', 'Evening', 'Night', 'All-Day'].includes(timeOfDay)
      ? timeOfDay
      : 'Morning';

    const routine = await generateRoutineFlow(goal.trim().slice(0, 500), safeTimeOfDay);
    return res.status(200).json(routine);
  } catch (error: any) {
    console.error('[Vercel Routine Error]:', error);
    return res.status(500).json({
      error: 'Failed to generate routine flow. Please try again later.',
    });
  }
}
