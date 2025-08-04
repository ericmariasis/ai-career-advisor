import { Router, Request, Response } from 'express';
import { redisConn } from '../lib/redisSearch';

const router = Router();

// Get trending favorites data for the last 60 minutes
router.get('/trend', async (req: Request, res: Response) => {
  try {
    const redis = await redisConn();
    const since = Date.now() - 60 * 60_000; // 60 minutes ago
    
    // Get all entries from the favorites_activity stream since the time threshold
    const entries = await redis.xRange(
      'favorites_activity',
      String(since),
      '+'
    );

    // Build minute buckets to aggregate activity
    const buckets: Record<number, number> = {};
    
    // Handle Redis stream entries - they come as an array of objects with id and message
    for (const entry of entries) {
      const id = entry.id;
      const message = entry.message;
      const ts = Number(id.split('-')[0]);
      const minute = Math.floor(ts / 60_000);
      const activity = Number(message.act || 0);
      buckets[minute] = (buckets[minute] || 0) + activity;
    }

    // Create a complete timeline with holes filled (60 minutes worth)
    const out: [number, number][] = [];
    for (let i = 59; i >= 0; i--) {
      const timestampMs = Date.now() - i * 60_000;
      const minute = Math.floor(timestampMs / 60_000);
      out.push([minute * 60_000, buckets[minute] ?? 0]);
    }

    console.log(`📈 Favorites trend: ${entries.length} stream entries, ${out.length} minute buckets`);
    res.json(out); // [[<unixMs>, count], ...]
  } catch (error) {
    console.error('Error getting favorites trend:', error);
    res.status(500).json({ error: 'Failed to get favorites trend' });
  }
});

export default router;