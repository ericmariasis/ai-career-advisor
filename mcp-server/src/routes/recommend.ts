// src/routes/recommend.ts
import { Router, Request, Response } from 'express';
import { redisConn, knnSearch } from '../lib/redisSearch';

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
const lean = (doc: any, score: number) => {
  if (!doc) return null;
  const { embedding, ...rest } = doc;
  return { ...rest, score };
};

router.get('/job/:id', async (req: Request, res: Response) => {
  const r      = await redisConn();
  const jobKey = `job:${req.params.id}`;

  /* 1️⃣ fetch the source job */
  const job = (await r.json.get(jobKey, { path: '.' })) as any;
  if (!job) {
    return res.status(404).json({ error: 'job not found' });
  }
  if (!Array.isArray(job.embedding) || !job.embedding.length) {
    return res
      .status(400)
      .json({ error: 'job has no embedding; enrich job first' });
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
