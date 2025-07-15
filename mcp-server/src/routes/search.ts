import { Router, Request, Response } from 'express';
import { jobsIndex } from '../algolia';
import type { Job } from '../types'; 

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/search/job/:id   → return one Algolia record by objectID
// ---------------------------------------------------------------------------
router.get('/job/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Missing job id' });
    }
  
    try {
      // generic <Job> keeps TypeScript happy if you imported the type
      const job = await jobsIndex.getObject<Job>(id);
      res.json(job);
    } catch (err: any) {
      console.error(err);
  
      // Algolia throws a 404-style error when object not found
      if (err.status === 404 || err.statusCode === 404) {
        return res.status(404).json({ error: 'Job not found' });
      }
  
      res.status(500).json({ error: 'Failed to fetch job' });
    }
  });
  

router.get('/', async (req: Request, res: Response) => {
    const {
      q = '',
      page = '0',
      hitsPerPage = '20',
      tag = ''
    } = req.query as Record<string, string>;
  
    // ─────────────────────────────────────────────────────────
    // 1 ️⃣  Validate & coerce params
    // ─────────────────────────────────────────────────────────
    const pageNum        = Number(page);
    const hitsPerPageNum = Number(hitsPerPage);
  
    const invalid =
      Number.isNaN(pageNum)        || pageNum < 0 ||
      Number.isNaN(hitsPerPageNum) || hitsPerPageNum <= 0 || hitsPerPageNum > 1000;
  
    if (invalid) {
      return res
        .status(400)
        .json({ error: 'page and hitsPerPage must be positive integers (≤ 1000)' });
    }
  
    console.log(
      `[search] q="${q}" page=${pageNum} hitsPerPage=${hitsPerPageNum}`,
    );
  
    try {
        const options: any = {
            page: pageNum,
            hitsPerPage: hitsPerPageNum,
            clickAnalytics: true,
            analyticsTags: ['ai-career-advisor'],
          };
        
          // if a tag filter was passed, apply it
          if (tag) {
            options.filters = `tags:"${tag}"`;
          }
        
          // perform the search with filters
          const algoliaResponse = await jobsIndex.search(q, options);
  
      res.json({
        queryID: algoliaResponse.queryID,
        nbHits:  algoliaResponse.nbHits,
        page:    algoliaResponse.page,
        nbPages: algoliaResponse.nbPages,
        hits:    algoliaResponse.hits,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Search failed' });
    }
  });

export default router;
