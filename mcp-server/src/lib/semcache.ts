import crypto from 'crypto';
import redis from './redis';
import { embedText } from './embed';

const DIM           = 1536;
const TAU           = 0.90;                // similarity threshold
const CACHE_PREFIX  = 'cache:';
const ONE_WEEK_SECS = 60 * 60 * 24 * 7;

type Task = 'skill_extract' | 'tech_skill_extract';

/**
 * Try to fetch a cached answer for (task, prompt).
 * Returns { answer, similarity } or null on miss.
 */
export async function getCachedAnswer(
  task: Task,
  prompt: string
): Promise<{ answer: string; similarity: number } | null> {
  const vec   = await embedText(prompt);           // Float32Array(1536)
  const blob  = Buffer.from(vec.buffer);           // pack for FT.PARAMS
  const query = `@task:{${task}}=>[KNN 1 @embedding $BLOB AS dist]`;

  const res: any = await redis.ft.search(
    'cacheIdx',
    query,
    {
      PARAMS: { BLOB: blob },
      DIALECT: 2,
      RETURN: ['$.answer', 'AS', 'answer', 'dist']
    }
  );

  if (res.total === 0) return null;

  const dist  = parseFloat(res.documents[0].value.dist);
  const sim   = 1 / (1 + dist);

  return sim >= TAU
    ? { answer: res.documents[0].value.answer, similarity: sim }
    : null;
}

/**
 * Store an answer in the cache under hash(prompt).
 */
export async function putCachedAnswer(
  task: Task,
  prompt: string,
  answer: string
): Promise<void> {
  const embedding = await embedText(prompt);
  const hash      = crypto.createHash('sha256').update(prompt).digest('hex');
  const key       = CACHE_PREFIX + hash;

  const doc = {
    task,
    embedding: Array.from(embedding),   // Redis JSON needs plain array
    answer,
    timestamp: Date.now()
  };

  await redis.json.set(key, '$', doc);
  await redis.expire(key, ONE_WEEK_SECS);
}
