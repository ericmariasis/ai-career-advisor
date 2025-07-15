import { Router } from 'express'
import aa from '../insightsServer'
import { jobsIndex }      from '../algolia'
import { toggleFavorite, getFavorites } from '../lib/store'   // ← add loadDB

const router = Router()

/** POST /api/favorites
 *  body: { objectID, queryID, position, userToken, save?: boolean }
 *  save defaults to true (= mark as favourite)
 */
router.post('/', async (req, res) => {
  try {
      const { objectID, userToken, save = true } = req.body;
      // queryID & position are optional﻿
      const { queryID = undefined, position = 0 } = req.body;
    
      if (!objectID || !userToken) {
        return res.status(400).json({ error: 'objectID and userToken are required' });
      }

    /* 1️⃣  persist ------------------------------------------------ */
    const total = await toggleFavorite(userToken, objectID, save)

    /* 2️⃣  send Insights event ------------------------------------ */
    if (save) {
        // ► user clicked  ⭐  — we record it as a conversion *after* a search
        (aa as any)('convertedObjectIDsAfterSearch', {
          index:      'jobs',
          eventName:  'Job saved',
          queryID,                   // ✅ allowed here
          objectIDs:  [objectID],
          userToken,
          eventSubtype: 'addToCart', // optional, fine to keep
        });
      } else {
        // ► user un-starred  — still a conversion, but no longer tied to a search
        (aa as any)('convertedObjectIDs', {
          index:      'jobs',
          eventName:  'Job unsaved',
          objectIDs:  [objectID],
          userToken,
          eventSubtype: 'removeFromCart', // optional (or omit)
        });
      }

    /* 3️⃣  (optional) lookup job for snack-bar title -------------- */
    let title: string | undefined
    try {
      const { results } = await jobsIndex.getObjects<{ title?: string }>([
        objectID,
      ])
      title = results[0]?.title
    } catch {
      /* ignore lookup errors */
    }

    res.json({ ok: true, total, savedTitle: title })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to save favourite' })
  }
})

/** GET /api/favorites?userToken=xyz
 *    → { ids: string[] }
 */
router.get('/', (req, res) => {
    const { userToken } = req.query as { userToken?: string };
    if (!userToken) {
      return res
        .status(400)
        .json({ error: 'userToken query‑param required' });
    }
  
    const ids = getFavorites(userToken);   // ← new helper (sync)
    return res.json({ ids });
  });

  /* -------------------------------------------------------------
 * GET /api/favorites/details?userToken=...
 * → returns the full job objects for the user’s saved IDs
 * ------------------------------------------------------------*/
router.get('/details', async (req, res) => {
    const { userToken } = req.query as { userToken?: string };
    if (!userToken) {
      return res.status(400).json({ error: 'userToken query-param required' });
    }
  
    const ids = getFavorites(userToken);          // LowDB helper you already have
    if (ids.length === 0) return res.json([]);    // nothing saved
  
    try {
      // bulk-fetch up to 1000 objects in one round-trip
      const { results } = await jobsIndex.getObjects(ids);
      // Algolia returns null for any missing IDs → filter them out
      res.json(results.filter(Boolean));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch saved jobs' });
    }
  });
  

export default router
