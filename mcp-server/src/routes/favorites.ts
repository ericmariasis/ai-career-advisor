import { Router, Request, Response } from 'express';
import { jobsIndex } from '../algolia';

const router = Router();

// crude in-memory store → swap for Redis/DB later
const store: Record<string, Set<string>> = {};

// POST /api/favorites
router.post('/', async (req: Request, res: Response) => {
  try {
    const { objectID, userToken } = req.body;
    if (!objectID || !userToken) {
      return res.status(400).json({ error: 'Missing body fields' });
    }

    // 1) persist
    store[userToken] = store[userToken] ?? new Set();
    store[userToken].add(objectID);

// 2) (optional) look up the job we just saved
const resp   = await jobsIndex.getObjects<{ title: string }>([objectID]);
const title  = resp.results[0]?.title;            // may be undefined
    res.json({
      ok: true,
      total: store[userToken].size,
      savedTitle: title,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save favourite' });
  }
});

export default router;
