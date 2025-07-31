// src/lib/store.ts
// 🚀  Redis client (reuse the singleton)
import redisClient from '../lib/redis';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
export interface SavedDB {
  // one Set per userToken (stored as string[] so JSON is trivial)
  favorites: Record<string, string[]>;
}

const favKey = (user: string) => `user:${user}:favs`;


/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
export async function toggleFavorite(
    userToken: string,
    objectID:  string,
    save:      boolean,
  ): Promise<number> {
    const key = favKey(userToken);
    if (save) await redisClient.hSet(key, objectID, 1);
    else      await redisClient.hDel(key, objectID);
    return await redisClient.hLen(key);   // new total
  }
  
  export async function getFavorites(userToken: string): Promise<string[]> {
    return await redisClient.hKeys(favKey(userToken));
  }