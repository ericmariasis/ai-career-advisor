"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCachedAnswer = getCachedAnswer;
exports.putCachedAnswer = putCachedAnswer;
const crypto_1 = __importDefault(require("crypto"));
const redis_1 = __importDefault(require("./redis"));
const embed_1 = require("./embed");
const DIM = 1536;
const TAU = 0.90; // similarity threshold
const CACHE_PREFIX = 'cache:';
const ONE_WEEK_SECS = 60 * 60 * 24 * 7;
/**
 * Try to fetch a cached answer for (task, prompt).
 * Returns { answer, similarity } or null on miss.
 */
async function getCachedAnswer(task, prompt) {
    const vec = await (0, embed_1.embedText)(prompt); // Float32Array(1536)
    const blob = Buffer.from(vec.buffer); // pack for FT.PARAMS
    const query = `@task:{${task}}=>[KNN 1 @embedding $BLOB AS dist]`;
    const res = await redis_1.default.ft.search('cacheIdx', query, {
        PARAMS: { BLOB: blob },
        DIALECT: 2,
        RETURN: ['$.answer', 'AS', 'answer', 'dist']
    });
    if (res.total === 0)
        return null;
    const dist = parseFloat(res.documents[0].value.dist);
    const sim = 1 / (1 + dist);
    return sim >= TAU
        ? { answer: res.documents[0].value.answer, similarity: sim }
        : null;
}
/**
 * Store an answer in the cache under hash(prompt).
 */
async function putCachedAnswer(task, prompt, answer) {
    const embedding = await (0, embed_1.embedText)(prompt);
    const hash = crypto_1.default.createHash('sha256').update(prompt).digest('hex');
    const key = CACHE_PREFIX + hash;
    const doc = {
        task,
        embedding: Array.from(embedding), // Redis JSON needs plain array
        answer,
        timestamp: Date.now()
    };
    await redis_1.default.json.set(key, '$', doc);
    await redis_1.default.expire(key, ONE_WEEK_SECS);
}
