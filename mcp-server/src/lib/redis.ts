// src/lib/redis.ts
// ─────────────────────────────
// Lazy‑connected Redis client
// Re‑uses the same instance across imports/hot‑reloads
// ─────────────────────────────
import { resolve } from 'node:path';
import dotenv from 'dotenv';
dotenv.config({ path: resolve(__dirname, '../../.env') }); 

import { createClient, RedisClientType } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';


let client: RedisClientType | undefined;

function getRedis(): RedisClientType {
  if (client) return client;          // already initialised

  client = createClient({ url: REDIS_URL });

  // Optional: simple logging
  client.on('connect', () =>
    console.log(`🟢  Redis connected  →  ${REDIS_URL}`)
  );
  client.on('error', (err) =>
    console.error('🔴  Redis client error:', err)
  );

  // Connect in the background; callers can await ping if they need certainty
  client.connect().catch((err) =>
    console.error('❌  Initial Redis connect failed:', err)
  );

  return client;
}

export default getRedis();
