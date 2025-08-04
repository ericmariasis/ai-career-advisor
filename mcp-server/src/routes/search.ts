import { Router, Request, Response } from 'express';
import redis from '../lib/redis';
import type { Job } from '../types';

/**
 * Generate a consistent mock cultural fit score (0-1) based on job characteristics
 * In production, this would come from AI analysis
 */
function generateMockFitScore(jobData: any): number {
  // Create a deterministic score based on job properties for consistency
  const title = (jobData.title || '').toLowerCase();
  const company = (jobData.company || '').toLowerCase();
  const location = (jobData.location || '').toLowerCase();
  const salary = jobData.salary_estimate || 0;
  
  // Create a simple hash from job properties for consistency
  let hash = 0;
  const str = `${title}-${company}-${location}-${salary}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert hash to a score between 0.6-0.95
  const normalizedHash = Math.abs(hash) % 100;
  return Math.round((0.6 + (normalizedHash / 100) * 0.35) * 100) / 100;
}

const router = Router();
/** Build a valid RediSearch TAG filter.
 *   - quote a value if it contains space or comma
 *   - escape embedded " or \ 
 *   - join multiple values with |
 *   - **NO spaces inside the braces**
 *   - keep a leading space so it can be concatenated
 */
const buildTagFilter = (field: string, values: string[]) => {
  if (!values.length) return '';

  const tokens = values.map(v => {
    // For TAG fields, escape commas and spaces with backslashes
    return v.replace(/([,\s\\])/g, '\\$1');
  });

  return ` @${field}:{${tokens.join('|')}}`;
};
// ─────────────────────────────────────────────────────────
// GET /api/search/job/:id   → fetch one job document
// ─────────────────────────────────────────────────────────
router.get('/job/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'Missing job id' });

  try {
    // returns `[ { … } ]`   →   cast then pick the first entry
    const raw = await redis.json.get(`job:${id}`, { path: '$' }) as Job[] | null;
    const job = raw?.[0];                        // 👈 unwrap

    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);  
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/search           → full‑text + facet search
// ─────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  // query‑string params
  const {
    q           = '',
    page        = '0',
    hitsPerPage = '20',
    company,
    location,
    industry,
    tag = '',
    salaryMin = '',
    salaryMax = '',
    facetFilters = ''
  } = req.query as Record<string, string | undefined>;

  // Debug logging
  console.log('🚀 SEARCH REQUEST:', new Date().toISOString());
  console.log('🔥 Query params:', { q, facetFilters, location, industry, company });

  // validate / coerce pagination
  const pageNum  = Math.max(Number(page), 0);
  const perPage  = Math.min(Math.max(Number(hitsPerPage), 1), 100);
  const offset   = pageNum * perPage;

// 1️⃣  start with the free‑text part (may be empty)
let redisQuery = q.trim();

// 🔧 NEW: if query might be a skill, add skills search
if (redisQuery && redisQuery.length > 2) {
  // Create a combined query: text search OR skills tag search
  redisQuery = `(${redisQuery} | @skills:{${redisQuery}})`;
}

// 2️⃣  append TAG / NUMERIC filters …
if (company)  redisQuery += buildTagFilter('company',  [company]);
if (location) redisQuery += buildTagFilter('location', [location]);
if (industry) redisQuery += buildTagFilter('industry', [industry]);

// Handle facetFilters parameter (array format: ["location:Seattle, WA", "industry:Tech"])
if (facetFilters) {
  try {
    // Handle both array (from axios) and string (from curl) formats
    let filters: string[];
    if (Array.isArray(facetFilters)) {
      filters = facetFilters;
    } else if (typeof facetFilters === 'string') {
      filters = JSON.parse(facetFilters) as string[];
    } else {
      filters = [];
    }
    
    const locationFilters: string[] = [];
    const industryFilters: string[] = [];
    const companyFilters: string[] = [];
    
    filters.forEach(filter => {
      if (filter.startsWith('location:')) {
        locationFilters.push(filter.substring(9)); // Remove "location:" prefix
      } else if (filter.startsWith('industry:')) {
        industryFilters.push(filter.substring(9)); // Remove "industry:" prefix
      } else if (filter.startsWith('company:')) {
        companyFilters.push(filter.substring(8)); // Remove "company:" prefix
      }
    });
    
    if (locationFilters.length) redisQuery += buildTagFilter('location', locationFilters);
    if (industryFilters.length) redisQuery += buildTagFilter('industry', industryFilters);
    if (companyFilters.length) redisQuery += buildTagFilter('company', companyFilters);
  } catch (e) {
    console.warn('Failed to parse facetFilters:', facetFilters, e);
  }
}

const tagList = tag.split(',').filter(Boolean);
if (tagList.length) redisQuery += buildTagFilter('tags', tagList);

if (salaryMin || salaryMax) {
  const min = salaryMin || '-inf';
  const max = salaryMax || '+inf';
  redisQuery += ` @salary_estimate:[${min} ${max}]`;
}

// 3️⃣  if everything is still empty, fall back to "*"
if (!redisQuery.trim()) redisQuery = '*';


  try {
    // 1️⃣  FT.SEARCH for hits
    const searchRes = await redis.ft.search(
      'jobsIdx',
      redisQuery,
      {
        LIMIT:   { from: offset, size: perPage },
        DIALECT: 3,
    
        // 👇 RETURN 1 $  AS json
        RETURN:  ['2', '$', 'AS', 'json']
      }
    );
    console.dir(searchRes, { depth: 4 });
    // node‑redis v4 returns { total, documents }
    const total = (searchRes as any).total as number;
    const documents = (searchRes as any).documents as {
      value: string;
      id: string;
    }[];

     interface RedisDoc {
         id: string;
         value: { json: string };
       }
      
       const docs = (searchRes as any).documents as RedisDoc[];
       const hits: Job[] = docs.map(d => {
          const parsed = JSON.parse(d.value.json);
          const jobData = Array.isArray(parsed) ? parsed[0] : parsed;  // unwrap `[ {...} ]`
          
          // Add fit score to search results for sorting
          return {
            ...jobData,
            fitScore: jobData.fitScore || generateMockFitScore(jobData)
          };
        });

    // 2️⃣  helper to aggregate facet counts
        // --- helper with raw FT.AGGREGATE (avoids TS typing issues) ---
       // --- helper with raw FT.AGGREGATE (adds DIALECT 3) -----------------
const facetCounts = async (field: string) => {
  console.log(`🔍 Computing facets for field: ${field} with query: ${redisQuery}`);
  
  try {
    // Try without DIALECT first
    const raw = await redis.sendCommand([
      'FT.AGGREGATE', 'jobsIdx', redisQuery,
      'GROUPBY', '1', `@${field}`,
      'REDUCE',  'COUNT', '0', 'AS', 'count',
      'LIMIT', '0', '50'  // Limit to 50 results
    ]) as unknown as any[];

    console.log(`🔍 Raw facet result for ${field}:`, raw?.slice(0, 6)); // First few items

    // Handle different response formats
    const map: Record<string, number> = {};
    
    if (raw.length === 1) {
      // Only total count returned - GROUPBY didn't work
      console.log(`⚠️ No grouping for ${field}, only got total:`, raw[0]);
      return {};
    }
    
    // Expected format: [totalCount, ["field1", "value1", "count", count1], ["field2", "value2", "count", count2], ...]
    for (let i = 1; i < raw.length; i++) {
      const arr = raw[i] as any[];
      if (arr && arr.length >= 4) {
        const val = arr[1];
        const count = Number(arr[3]);
        if (val && !isNaN(count)) {
          map[val] = count;
        }
      }
    }
    
    console.log(`🔍 Final facet map for ${field}:`, Object.keys(map).length, 'entries');
    if (Object.keys(map).length > 0) {
      console.log(`🔍 Sample entries:`, Object.entries(map).slice(0, 3));
    }
    return map;
  } catch (error) {
    console.error(`❌ Facet aggregation failed for ${field}:`, error);
    return {};
  }
};


    const [companyFacet, locationFacet, skillsFacet] = await Promise.all([
      facetCounts('company'),
      facetCounts('location'),
      facetCounts('skills')
    ]);

    res.json({
      query: q,
      nbHits: total,
      page: pageNum,
      nbPages: Math.ceil(total / perPage),
      hits,
      facets: {
        company:  companyFacet,
        location: locationFacet,
        skills:   skillsFacet
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
