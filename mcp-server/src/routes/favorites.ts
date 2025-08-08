import { Router } from 'express'
import aa from '../insightsServer'
import { getFavorites, toggleFavorite } from '../lib/store'
import { redisConn } from '../lib/redisSearch'
import { broadcastFavorite } from '../lib/pubsub'
import { generalApiLimiter } from '../middleware/rateLimiter'

const router = Router()

/** POST /api/favorites
 *  body: { objectID, queryID, position, userToken, save?: boolean }
 *  save defaults to true (= mark as favourite)
 */
router.post('/', generalApiLimiter, async (req, res) => {
  try {
      const { objectID, userToken, save = true } = req.body as {
        objectID?: string
        userToken?: string
        save?: boolean
      };
      // queryID & position are optional
      const { queryID, position } = req.body as {
        queryID?: string
        position?: number
      };
    
      // Validate required fields as non-empty strings
      if (typeof objectID !== 'string' || objectID.trim() === '' ||
          typeof userToken !== 'string' || userToken.trim() === '') {
        return res.status(400).json({ error: 'objectID and userToken are required' });
      }

    /* 1️⃣  persist ------------------------------------------------ */
    const total = await toggleFavorite(userToken, objectID, save)
    
    // Broadcast real-time update
    await broadcastFavorite(save ? 1 : -1, userToken, objectID)
    
    /* 1️⃣.5  store activity for trending data ---------------------- */
    try {
      const redis = await redisConn();
      const delta = save ? 1 : -1;
      await redis.xAdd('favorites_activity', '*', {
        'delta': String(delta),
        'user': userToken,
        'job': objectID
      });
      console.log(`📈 Added activity to stream: ${delta > 0 ? '+1' : '-1'} for job ${objectID}`);
    } catch (err) {
      console.error('Failed to write activity stream:', err);
    }

    /* 2️⃣  send Insights event ------------------------------------ */
    const index = process.env.ALGOLIA_INDEX ?? 'jobs';
    if (save) {
      // If we have a queryID, report a conversion after search; otherwise generic conversion
      if (typeof queryID === 'string' && queryID.trim() !== '') {
        (aa as any)('convertedObjectIDsAfterSearch', {
          index,
          eventName: 'Job saved',
          queryID,
          objectIDs: [objectID],
          userToken,
          ...(typeof position === 'number' ? { positions: [position] } : {}),
          eventSubtype: 'addToCart',
        });
      } else {
        (aa as any)('convertedObjectIDs', {
          index,
          eventName: 'Job saved',
          objectIDs: [objectID],
          userToken,
          eventSubtype: 'addToCart',
        });
      }
    } else {
      (aa as any)('convertedObjectIDs', {
        index,
        eventName: 'Job unsaved',
        objectIDs: [objectID],
        userToken,
        eventSubtype: 'removeFromCart',
      });
    }

    /* 3️⃣  (optional) lookup job for snack-bar title -------------- */
    let title: string | undefined
    try {
      const redis = await redisConn();
      const key = `job:${objectID}`;
      const jobData = await redis.json.get(key, { path: '$.title' });
      if (jobData && Array.isArray(jobData) && jobData[0]) {
        title = String(jobData[0]);
      }
    } catch {
      /* ignore lookup errors */
    }

    res.json({ ok: true, total, savedTitle: title })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to save favorite' })
  }
})

/** GET /api/favorites?userToken=xyz
 *    → { ids: string[] }
 */
router.get('/', async (req, res) => {
    const { userToken } = req.query as { userToken?: string };
    if (!userToken) {
      return res
        .status(400)
        .json({ error: 'userToken query‑param required' });
    }

    try {
      const ids = await getFavorites(userToken);
      return res.json({ ids });
    } catch (err) {
      console.error('Failed to fetch favorites for user:', userToken, err);
      return res.status(500).json({ error: 'Failed to fetch favorites' });
    }
  });

  /* -------------------------------------------------------------
 * GET /api/favorites/details?userToken=...
 * → returns the full job objects for the user's saved IDs
 * ------------------------------------------------------------*/
router.get('/details', async (req, res) => {
    const { userToken } = req.query as { userToken?: string };
    if (!userToken) {
      return res.status(400).json({ error: 'userToken query-param required' });
    }
  
    const ids = await getFavorites(userToken);
    if (ids.length === 0) return res.json([]);
  
    try {
      const redis = await redisConn();
      const jobs = [];
      
      // Fetch each job from Redis using the job:ID pattern
      for (const id of ids) {
        const key = `job:${id}`;
        
        try {
          const jobData = await redis.json.get(key, { path: '$' });
          if (jobData && Array.isArray(jobData) && jobData[0]) {
            jobs.push(jobData[0]);
          }
        } catch (err) {
          // Skip jobs that can't be found
        }
      }
      
      res.json(jobs);
    } catch (err) {
      console.error('🔥 Backend: Error:', err);
      res.status(500).json({ error: 'Failed to fetch saved jobs' });
    }
  });
  

export default router

