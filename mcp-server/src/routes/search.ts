import { Router, Request, Response } from 'express';
import { jobsIndex } from '../algolia';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    const {
      q = '',
      page = '0',
      hitsPerPage = '20',
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
      const algoliaResponse = await jobsIndex.search(q, {
        page:        pageNum,
        hitsPerPage: hitsPerPageNum,
        clickAnalytics: true,
        analyticsTags:  ['ai-career-advisor'],
      });
  
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
