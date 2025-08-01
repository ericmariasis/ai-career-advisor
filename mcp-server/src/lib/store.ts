// src/lib/store.ts
// 🚀  Redis client (reuse the singleton)
import redisClient from '../lib/redis';

/* NEW – analytics stream constants */
const STREAM_KEY = 'favorites_activity';   // stream name
const STREAM_MAX = 10_000;                 // keep roughly last 10k events

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
export async function toggleFavorite(
  userToken: string,
  objectID:  string,
  save:      boolean,
): Promise<number> {
  const key = `user:${userToken}:favs`;

  // 1️⃣  normal favourites logic (unchanged)
  if (save) await redisClient.hSet(key, objectID, 1);
  else      await redisClient.hDel(key, objectID);

  const total = await redisClient.hLen(key);

  const delta = save ? 1 : -1;

  // 2️⃣  fire-and-forget analytics event
  try {
    await redisClient.xAdd(
      STREAM_KEY,          // key
      '*',                 // auto-ID
      {                    // message fields – **Record<string, string>**
        user:  userToken,
        job:   objectID,
        act:   (save ? 1 : -1).toString(),  // stringify for Redis
        total: total.toString(),
        ts:    Date.now().toString()
      },
      {                    // trim (~10000 entries)
        TRIM: { strategy: 'MAXLEN', strategyModifier: '~', threshold: STREAM_MAX }
      }
    );
  } catch (err) {
    console.error('[favorites] stream log failed', err);
    /* do NOT block the main request – just log the error */
  }

  return total;
}

export async function getFavorites(userToken: string): Promise<string[]> {
  return await redisClient.hKeys(`user:${userToken}:favs`);
}
