import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL ?? 'redis://localhost:6379' });
let ready = false;
export async function redisConn() {
  if (!ready) {
    await redis.connect();
    ready = true;
  }
  return redis;
}

/**
 * K‑nearest‑neighbour search on jobsIdx.
 * @param vec   – plain number[1536]
 * @param k     – neighbours to return (incl. the probe itself)
 * @param filterClause – optional RediSearch filter string, e.g. '@industry:{Tech}'
 */
export async function knnSearch(
  vec: number[],
  k = 6,
  filterClause = '*'
) {
  const r = await redisConn();

  // pack the float[] into binary the way RediSearch expects
  const bytes = Buffer.from(Float32Array.from(vec).buffer);

  // ask RediSearch to compute and return the distance as `score`
  const query = `${filterClause}=>[KNN ${k} @embedding $BLOB AS score]`;

  const resp = await r.ft.search(
    'jobsIdx',
    query,
    {
      PARAMS: { BLOB: bytes },
      DIALECT: 2,
      SORTBY: { BY: 'score', DIRECTION: 'ASC' },
      /* 👇 add the `score` alias so it’s present in d.value */
      RETURN: ['$.objectID', 'AS', 'id', 'score', '$', 'AS', 'json']
    }
  );

  // flatten to nice objects
  return resp.documents.map((d: any) => ({
    id: JSON.parse(d.value.id),
    score: d.value.score !== undefined ? Number(d.value.score) : null
    // d.value.json is the whole Job JSON if you need it later
  }));
}
