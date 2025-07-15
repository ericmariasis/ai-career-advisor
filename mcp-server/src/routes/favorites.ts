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
    const {
      objectID,
      queryID,
      position = 1,
      userToken,
      save = true,
    } = req.body

    if (!objectID || !queryID || !userToken) {
      return res.status(400).json({ error: 'Missing body fields' })
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

export default router
