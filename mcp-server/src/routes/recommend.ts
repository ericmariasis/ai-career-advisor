import { Router } from 'express';
import { jobsIndex } from '../algolia';
import type { Job } from '../types';

const router = Router();

/** GET /api/recommend/job/:id → Job[] */
router.get('/job/:id', async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'Missing job id' });

  try {
    // 1️⃣ fetch the base job so we know its title (and tags)
    const { results } = await jobsIndex.getObjects<{ title: string; tags?: string[] }>([id]);
    const base = results[0];
    if (!base || !base.title) {
      return res.status(404).json({ error: 'Base job not found' });
    }

    // 2️⃣ run a lightweight search on the title + first tag (if any) for 5 hits
    const query = base.tags?.[0]
      ? `${base.title} ${base.tags[0]}`
      : base.title;
    const resp = await jobsIndex.search<Job>(query, {
      hitsPerPage: 6,       // grab a few so we can drop the original
      filters: `NOT objectID:${id}`, 
    });

    // 3️⃣ drop the original job if it sneaks in, and cap at 5
    const similar = resp.hits
      .filter((h) => h.objectID !== id)
      .slice(0, 5);

    return res.json(similar);
  } catch (err) {
    console.error('Fallback-recommend error', err);
    return res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

export default router;
