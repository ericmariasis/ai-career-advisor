import { Router, Request, Response } from 'express';
import { jobsIndex } from '../lib/algolia';
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
                  tag = '',
                  salaryMin = '',
                  salaryMax = '',
                } = req.query as Record<string, string>;
        
  const rawFF =
    // try plain
    req.query.facetFilters
    // or fallback to bracketed name
    ?? (req.query as any)['facetFilters[]'];
                let facetFilters: string[] | undefined;
                if (rawFF !== undefined) {
                  if (Array.isArray(rawFF)) {
                    facetFilters = rawFF.map((v) => String(v));
                  } else {
                    facetFilters = [String(rawFF)];
                  }
                }
            // if the user passed a `tag`, also treat it as a facetFilter on "tags"
            if (tag) {
              const tf = `tags:"${tag}"`;
              facetFilters = facetFilters ? [...facetFilters, tf] : [tf];
            }

            
        // ─── build numericFilters from salaryMin / salaryMax ───
        const numericFilters: string[] = [];
        if (salaryMin && !isNaN(Number(salaryMin))) {
          numericFilters.push(`salary_estimate>=${Number(salaryMin)}`);
        }
        if (salaryMax && !isNaN(Number(salaryMax))) {
          numericFilters.push(`salary_estimate<=${Number(salaryMax)}`);
        }
  
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
        console.log('❯ req.query:', req.query);
console.log('❯ facetFilters (parsed):', facetFilters);

   // ─── group same-facet filters for OR ───────────────────────────────
   const flatFF = facetFilters ?? [];
   const industryFF = flatFF.filter(f => f.startsWith('industry:'));
   const locationFF = flatFF.filter(f => f.startsWith('location:'));
   const othersFF   = flatFF.filter(
     f => !f.startsWith('industry:') && !f.startsWith('location:')
   );

   // build nested facetFilters
   const nestedFF: (string|string[])[] = [];
   if (industryFF.length) nestedFF.push(industryFF);
   if (locationFF.length) nestedFF.push(locationFF);
   nestedFF.push(...othersFF);

   const searchOptions: any = {
     page:           pageNum,
     hitsPerPage:    hitsPerPageNum,
     clickAnalytics: true,
     analyticsTags:  ['ai-career-advisor'],
     facets:         ['location','industry','tags'],
     facetFilters:   nestedFF.length ? nestedFF : undefined,
   };
   if (numericFilters.length) {
     searchOptions.numericFilters = numericFilters;
   }
                            console.log('❯ searchOptions:', searchOptions);
            
                            const algoliaResponse = await jobsIndex.search(q, searchOptions);
  
                          res.json({
                                queryID: algoliaResponse.queryID,
                                nbHits:  algoliaResponse.nbHits,
                                page:    algoliaResponse.page,
                                nbPages: algoliaResponse.nbPages,
                                hits:    algoliaResponse.hits,
                                // ─── NEW: pass back the facet counts to the client ───
                                facets:  algoliaResponse.facets,
                              });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Search failed' });
    }
  });

export default router;
