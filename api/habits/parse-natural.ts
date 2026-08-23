import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseNaturalLanguageHabit } from '../../server/services/aiService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text string is required to parse habit.' });
    }

    if (text.length > 1000) {
      return res.status(400).json({ error: 'Text exceeds maximum allowed length of 1000 characters.' });
    }

    const parsed = await parseNaturalLanguageHabit(text.trim().slice(0, 1000));
    return res.status(200).json(parsed);
  } catch (error: any) {
    console.error('[Vercel Parse Natural Error]:', error);
    return res.status(500).json({
      error: 'Failed to parse natural language habit. Please try again later.',
    });
  }
}
