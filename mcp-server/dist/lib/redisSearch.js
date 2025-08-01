"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisConn = redisConn;
exports.knnSearch = knnSearch;
const redis_1 = require("redis");
const redis = (0, redis_1.createClient)({ url: (_a = process.env.REDIS_URL) !== null && _a !== void 0 ? _a : 'redis://localhost:6379' });
let ready = false;
async function redisConn() {
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
async function knnSearch(vec, k = 6, filterClause = '*') {
    const r = await redisConn();
    // pack the float[] into binary the way RediSearch expects
    const bytes = Buffer.from(Float32Array.from(vec).buffer);
    // ask RediSearch to compute and return the distance as `score`
    const query = `${filterClause}=>[KNN ${k} @embedding $BLOB AS score]`;
    const resp = await r.ft.search('jobsIdx', query, {
        PARAMS: { BLOB: bytes },
        DIALECT: 2,
        SORTBY: { BY: 'score', DIRECTION: 'ASC' },
        /* 👇 add the `score` alias so it’s present in d.value */
        RETURN: ['$.objectID', 'AS', 'id', 'score', '$', 'AS', 'json']
    });
    // flatten to nice objects
    return resp.documents.map((d) => ({
        id: JSON.parse(d.value.id),
        score: d.value.score !== undefined ? Number(d.value.score) : null
        // d.value.json is the whole Job JSON if you need it later
    }));
}
