// testKnn.mjs
import { createClient } from 'redis';

const TEST_ID = process.env.TEST_ID || '108606';
const r = createClient({ url: 'redis://localhost:6379' });

await r.connect();

const vec = (await r.json.get(`job:${TEST_ID}`, { path: '$.embedding' }))[0];
console.log('vector length:', vec.length);

const blob = Buffer.from(Float32Array.from(vec).buffer);      // --> binary blob

const hits = await r.ft.search(
  'jobsIdx',
  '*=>[KNN 3 @embedding $vec AS score]',
  {
    PARAMS: { vec: blob },
    DIALECT: 2,
    SORTBY: { BY: 'score', DIRECTION: 'ASC' },
    LIMIT: { from: 0, size: 3 },
    RETURN: ['$.title']
  }
);

console.dir(hits, { depth: null });
await r.quit();
