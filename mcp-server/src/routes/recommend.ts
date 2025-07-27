// src/routes/recommend.ts
import { Router, Request, Response } from 'express';
import redis from '../lib/redis';
import type { Job } from '../types';

const router = Router();

/** Build one RediSearch TAG filter (NO leading space) */
const tagFilter = (field: string, value: string) => {
  const esc = value.replace(/(["\\])/g, '\\$1');          // \" or \\
  return /[,\s]/.test(esc)
    ? `@${field}:{"${esc}"}`
    : `@${field}:{${esc}}`;
};
router.get('/job/:id', async (req: Request, res: Response) => {
  try {
    /* 1️⃣ reference job */
    const raw = await redis.json.get(`job:${req.params.id}`, { path: '$' }) as unknown;
    const job = (Array.isArray(raw) ? raw[0] : raw) as Job | undefined;
    if (!job) return res.status(404).json({ error: 'Job not found' });

    /* 2️⃣ build the RediSearch query */
    const filters: string[] = [];
    if (job.industry) filters.push(tagFilter('industry', job.industry));
    if (job.location) filters.push(tagFilter('location', job.location));

    // AFTER   (star only if you need it)
    let q = filters.length
      ? '(' + filters.join('|') + ')'    // just the filters
      : '*';                             // no filters? return everything

    /* === DEBUG #1 — final query string */
    console.log('recommend query →', q);

    /* build the exact raw‑args array (handy to copy into redis‑cli) */
    const rawArgs = [
      'FT.SEARCH', 'jobsIdx', q,
      'DIALECT', '3',
      'LIMIT', '0', '8',
      'RETURN', '1', '$'
    ];
    /* === DEBUG #2 — raw arguments */
    console.log('FT.SEARCH raw args →', JSON.stringify(rawArgs));

    const rsp = await redis.ft.search(
      'jobsIdx',
      q,
      {
        DIALECT: 3,
        LIMIT:   { from: 0, size: 8 },
        RETURN:  ['2', '$', 'AS', 'json']   // ← alias “json”
      });

    /* === DEBUG #3 — inspect the reply (shallow) */
    console.dir(rsp, { depth: 2 });

    /* unwrap hits */
    type RedisDoc = { value: { json?: string; $?: unknown } };
    const docs = (rsp as any).documents as RedisDoc[] | undefined;
    const hits: Job[] = (docs ?? [])
      .map(d => {
        const rawVal = d.value.json ?? d.value.$;
        const parsed = typeof rawVal === 'string' ? JSON.parse(rawVal) : rawVal;
        return Array.isArray(parsed) ? parsed[0] : parsed;
      })
      .filter(h => h.objectID !== job.objectID);   // extra safety

    res.json(hits);

  } catch (err) {
    console.error('recommend error', err);
    res.status(500).json({ error: 'recommendation failed' });
  }
});

export default router;
