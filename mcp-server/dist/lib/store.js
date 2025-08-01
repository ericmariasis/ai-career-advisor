"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleFavorite = toggleFavorite;
exports.getFavorites = getFavorites;
// src/lib/store.ts
// 🚀  Redis client (reuse the singleton)
const redis_1 = __importDefault(require("../lib/redis"));
/* NEW – analytics stream constants */
const STREAM_KEY = 'favorites_activity'; // stream name
const STREAM_MAX = 10000; // keep roughly last 10k events
/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
async function toggleFavorite(userToken, objectID, save) {
    const key = `user:${userToken}:favs`;
    // 1️⃣  normal favourites logic (unchanged)
    if (save)
        await redis_1.default.hSet(key, objectID, 1);
    else
        await redis_1.default.hDel(key, objectID);
    const total = await redis_1.default.hLen(key);
    const delta = save ? 1 : -1;
    // 2️⃣  fire-and-forget analytics event
    try {
        await redis_1.default.xAdd(STREAM_KEY, // key
        '*', // auto-ID
        {
            user: userToken,
            job: objectID,
            act: (save ? 1 : -1).toString(), // stringify for Redis
            total: total.toString(),
            ts: Date.now().toString()
        }, {
            TRIM: { strategy: 'MAXLEN', strategyModifier: '~', threshold: STREAM_MAX }
        });
    }
    catch (err) {
        console.error('[favorites] stream log failed', err);
        /* do NOT block the main request – just log the error */
    }
    return total;
}
async function getFavorites(userToken) {
    return await redis_1.default.hKeys(`user:${userToken}:favs`);
}
