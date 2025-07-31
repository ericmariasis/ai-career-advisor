import { vi } from 'vitest';

// 🔑  Mock the exact specifier semcache uses:  "./embed"
vi.mock('./embed', () => ({
  embedText: (txt: string) => {
    // one-hot orthogonal – different prompts → cosine-sim ≈ 0
    const v = new Float32Array(1536);
    v[txt.length % 1536] = 1;
    return Promise.resolve(v);
  },
}));

import { beforeAll, afterAll, test, expect } from 'vitest';
import { startRedis, stopRedis } from './helpers/redis-docker';
import redis from '../src/lib/redis';
import { ensureCacheIndex } from '../src/lib/createCacheIndex';
import { getCachedAnswer, putCachedAnswer, _setEmbedder } from '../src/lib/semcache.ts';

const stubEmbed = (txt: string) => {
    const v = new Float32Array(1536);       // typed array  ✅
    v[txt.length % 1536] = 1;               // one-hot, orthogonal
    return Promise.resolve(v);
  };

let proc: any;

beforeAll(async () => {
  _setEmbedder(stubEmbed);              // ← swap in stub before any calls
  proc = await startRedis();
  await ensureCacheIndex();
});

afterAll(async () => {
  await redis.quit();
  stopRedis(proc);
});

test('put then hit cache', async () => {
  const prompt = '[SkillExtract] sample';
  await putCachedAnswer('skill_extract', prompt, 'python, sql');
  const hit = await getCachedAnswer('skill_extract', prompt);
  expect(hit).not.toBeNull();
});

test('miss when prompt is different', async () => {
  const hit = await getCachedAnswer('skill_extract', '[SkillExtract] other');
  expect(hit).toBeNull();               // ✅ orthogonal ⇒ similarity 0.5 < τ
});
