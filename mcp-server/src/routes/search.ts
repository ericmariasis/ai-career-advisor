import { Router, Request, Response } from 'express';
import redis from '../lib/redis';
import type { Job } from '../types';

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
    const esc = v.replace(/(["\\])/g, '\\$1');    // escape " and \
    return /[,\s]/.test(esc) ? `"${esc}"` : esc; // quote if needed
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
    salaryMax = ''
  } = req.query as Record<string, string | undefined>;

  // validate / coerce pagination
  const pageNum  = Math.max(Number(page), 0);
  const perPage  = Math.min(Math.max(Number(hitsPerPage), 1), 100);
  const offset   = pageNum * perPage;

// 1️⃣  start with the free‑text part (may be empty)
let redisQuery = q.trim();

// 2️⃣  append TAG / NUMERIC filters …
if (company)  redisQuery += buildTagFilter('company',  [company]);
if (location) redisQuery += buildTagFilter('location', [location]);
if (industry) redisQuery += buildTagFilter('industry', [industry]);

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
          return Array.isArray(parsed) ? parsed[0] : parsed;  // unwrap `[ {...} ]`
        });

    // 2️⃣  helper to aggregate facet counts
        // --- helper with raw FT.AGGREGATE (avoids TS typing issues) ---
       // --- helper with raw FT.AGGREGATE (adds DIALECT 3) -----------------
const facetCounts = async (field: string) => {
  const raw = await redis.sendCommand([
    'FT.AGGREGATE', 'jobsIdx', redisQuery,
    'DIALECT', '3',                    // 👈  NEW
    'GROUPBY', '1', `@${field}`,
    'REDUCE',  'COUNT', '0', 'AS', 'count'
  ]) as unknown as any[];

  // raw[0] = total groups, then repeating [ "field", value, "count", N ]
  const map: Record<string, number> = {};
  for (let i = 1; i < raw.length; i++) {
    const arr   = raw[i] as any[];
    const val   = arr[1];
    const count = Number(arr[3]);
    map[val] = count;
  }
  return map;
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
