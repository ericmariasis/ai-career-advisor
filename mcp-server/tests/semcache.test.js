"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
// 🔑  Mock the exact specifier semcache uses:  "./embed"
vitest_1.vi.mock('./embed', () => ({
    embedText: (txt) => {
        // one-hot orthogonal – different prompts → cosine-sim ≈ 0
        const v = new Float32Array(1536);
        v[txt.length % 1536] = 1;
        return Promise.resolve(v);
    },
}));
const vitest_2 = require("vitest");
const redis_docker_1 = require("./helpers/redis-docker");
const redis_1 = __importDefault(require("../src/lib/redis"));
const createCacheIndex_1 = require("../src/lib/createCacheIndex");
const semcache_ts_1 = require("../src/lib/semcache.ts");
const stubEmbed = (txt) => {
    const v = new Float32Array(1536); // typed array  ✅
    v[txt.length % 1536] = 1; // one-hot, orthogonal
    return Promise.resolve(v);
};
let proc;
(0, vitest_2.beforeAll)(async () => {
    (0, semcache_ts_1._setEmbedder)(stubEmbed); // ← swap in stub before any calls
    proc = await (0, redis_docker_1.startRedis)();
    await (0, createCacheIndex_1.ensureCacheIndex)();
});
(0, vitest_2.afterAll)(async () => {
    await redis_1.default.quit();
    (0, redis_docker_1.stopRedis)(proc);
});
(0, vitest_2.test)('put then hit cache', async () => {
    const prompt = '[SkillExtract] sample';
    await (0, semcache_ts_1.putCachedAnswer)('skill_extract', prompt, 'python, sql');
    const hit = await (0, semcache_ts_1.getCachedAnswer)('skill_extract', prompt);
    (0, vitest_2.expect)(hit).not.toBeNull();
});
(0, vitest_2.test)('miss when prompt is different', async () => {
    const hit = await (0, semcache_ts_1.getCachedAnswer)('skill_extract', '[SkillExtract] other');
    (0, vitest_2.expect)(hit).toBeNull(); // ✅ orthogonal ⇒ similarity 0.5 < τ
});
