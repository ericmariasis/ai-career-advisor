// src/routes/recommend.ts
import { Router, Request, Response } from 'express';
import { redisConn, knnSearch } from '../lib/redisSearch';
import { JobRecord, RedisSearchDoc } from '../types';
import { embedText } from '../lib/embed';

const router = Router();

/* ------------------------------------------------------------------ *
 * What one K‑NN search hit can look like
 * ------------------------------------------------------------------ */
type KnnHit = {
  id: string | number;
  score?: number | null;           // FT.SEARCH … RETURN 1 score
  vectorDistance?: number | null;  // FT.SEARCH … RETURN 1 __vector_distance
  distance?: number | null;        // helper aliases
  __dist?: number | null;          // raw RediSearch alias
};

/** Pick whichever distance field is present and coerce to a number */
const dist = (h: KnnHit): number =>
  h.vectorDistance ?? h.distance ?? h.__dist ?? h.score ?? 0;

const asSimilarity = (d: number | null) =>
  d === null ? null : 1 / (1 + d);        // 0 → 1,  0.5 → 0.67, …

/** escape → build one RediSearch TAG filter (NO leading space). */
const tagFilter = (field: string, value: string) => {
  const esc = value.replace(/(["\\])/g, '\\$1');          // \" or \\
  return /[,\s]/.test(esc) ? `@${field}:{"${esc}"}` : `@${field}:{${esc}}`;
};

/** drop the heavy vector and tack on the neighbour’s score */
const lean = (doc: JobRecord | null, score: number): (Omit<JobRecord, 'embedding'> & { score: number }) | null => {
  if (!doc) return null;
  const { embedding, ...rest } = doc;
  return { ...rest, score };
};

// Simple job suggestions endpoint for "no results" fallback
router.get('/suggestions', async (req: Request, res: Response) => {
  console.log('🎯 SUGGESTIONS ROUTE HIT with query:', req.query);
  const { text } = req.query;
  
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Missing or empty text parameter' });
  }

  try {
    const r = await redisConn();
    
    // For now, just return some related jobs based on simple search
    // This is a simplified version that searches for jobs and returns a few
    const searchRes = await r.ft.search(
      'jobsIdx',
      `${text.trim()}*`, // Simple prefix search
      {
        LIMIT: { from: 0, size: 6 },
        DIALECT: 3,
        RETURN: ['2', '$', 'AS', 'json']
      }
    );

    const total = (searchRes as any).total as number;
    const documents = (searchRes as any).documents as {
      value: string;
      id: string;
    }[];

    if (total === 0) {
      // If no matches, return some random popular jobs
      const fallbackRes = await r.ft.search(
        'jobsIdx',
        '*',
        {
          LIMIT: { from: 0, size: 6 },
          DIALECT: 3,
          RETURN: ['2', '$', 'AS', 'json']
        }
      );
      const fallbackDocs = (fallbackRes as any).documents as {
        value: string;
        id: string;
      }[];
      
      const suggestions = fallbackDocs.map((doc: any) => {
        const parsed = JSON.parse(doc.value.json);
        const job = Array.isArray(parsed) ? parsed[0] : parsed;  // unwrap `[ {...} ]`
        return {
          ...job,
          score: 0.5 // Mock similarity score
        };
      });
      
      return res.json(suggestions);
    }

    const suggestions = documents.map((doc: any) => {
      const parsed = JSON.parse(doc.value.json);
      const job = Array.isArray(parsed) ? parsed[0] : parsed;  // unwrap `[ {...} ]`
      return {
        ...job,
        score: 0.8 // Mock similarity score for text matches
      };
    });

    res.json(suggestions);
    
  } catch (err) {
    console.error('Suggestions error:', err);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

router.get('/job/:id', async (req: Request, res: Response) => {
  console.log('🔍 ID ROUTE HIT with params:', req.params);
  const r      = await redisConn();
  const jobKey = `job:${req.params.id}`;

  /* 1️⃣ fetch the source job */
  const job = (await r.json.get(jobKey, { path: '.' })) as JobRecord | null;
  if (!job) {
    return res.status(404).json({ error: 'job not found' });
  }
   if (!Array.isArray(job.embedding) || !job.embedding.length) {
       // no vector yet – let the UI show the job details but no recs
       return res.json({ objectID: job.objectID, recommendations: [] });
     }

  /* 2️⃣ nearest‑neighbour search (k = 6 so we can drop self) */
  const hits = (await knnSearch(job.embedding, 6)) as KnnHit[];
  console.log('► knn hits', hits.map(h => h.id));

  /* 3️⃣ normalise ids, drop self, add numeric score, cap at 5 */
  const normalise = (raw: string | number) =>
    raw.toString().startsWith('job:') ? raw.toString() : `job:${raw}`;

  const selfId = normalise(req.params.id);          // "job:99991"

  const neighbours = hits
  .map(h => {
    const dist = h.score ?? h.vectorDistance ?? h.distance ?? h.__dist ?? null;
    return {
      id   : normalise(h.id),
      score: asSimilarity(dist)            // 1 = identical, →0 = far
    };
  })
  .filter(n => n.id !== selfId)
  .slice(0, 5);

  if (!neighbours.length) {
    return res.json({ objectID: job.objectID, recommendations: [] });
  }

  /* 4️⃣ batch‑fetch neighbour docs, strip vector, attach score */
  const pipe = r.multi();
  neighbours.forEach(n => pipe.json.get(n.id, { path: '.' }));
  const raw = (await pipe.exec()) as unknown[];        // [[doc|null], …]

  const recommendations = raw
    .map((entry, idx) => (Array.isArray(entry) ? entry[1] : entry)) // unwrap
    .map((doc, idx)   => lean(doc, neighbours[idx].score ?? 0))
    .filter(Boolean);                                               // drop nulls

  res.json({ objectID: job.objectID, recommendations });
});

export default router;
