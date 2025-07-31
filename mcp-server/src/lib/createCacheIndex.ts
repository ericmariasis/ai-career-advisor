// src/lib/createCacheIndex.ts
import redis from './redis';   // adjust path to your singleton

export async function ensureCacheIndex() {
  try {
    await redis.ft.info('cacheIdx');          // will throw if index absent
  } catch {
    console.log('[cacheIdx] creating RedisSearch index …');
    // Use string literals for field types to avoid import issues
    await (redis as any).ft.create(
      'cacheIdx',
      {
        '$.task':     { type: 'TAG', AS: 'task' },
        '$.embedding': {
          type: 'VECTOR',
          AS: 'embedding',
          ALGORITHM: 'HNSW',
          TYPE: 'FLOAT32',
          DIM: 1536,
          DISTANCE_METRIC: 'COSINE'
        },
        '$.timestamp': { type: 'NUMERIC', AS: 'timestamp' }
      },
      { ON: 'JSON', PREFIX: 'cache:' }
    );
  }
}
