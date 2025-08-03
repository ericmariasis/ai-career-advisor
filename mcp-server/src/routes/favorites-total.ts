import { Router, Request, Response } from 'express';
import { redisConn } from '../lib/redisSearch';

const router = Router();

// Get total count of all favorites across all users
router.get('/total', async (req: Request, res: Response) => {
  try {
    const redis = await redisConn();
    
    // Get all user hashes that store favorites (pattern: favorites:*)
    const userKeys = await redis.keys('favorites:*');
    
    let totalFavorites = 0;
    
    // Count favorites for each user
    for (const userKey of userKeys) {
      const userFavorites = await redis.hLen(userKey);
      totalFavorites += userFavorites;
    }

    res.json({ total: totalFavorites });
  } catch (error) {
    console.error('Error getting favorites total:', error);
    res.status(500).json({ error: 'Failed to get favorites count' });
  }
});

export default router;