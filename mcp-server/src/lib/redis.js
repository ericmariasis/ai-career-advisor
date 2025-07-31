"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/lib/redis.ts
// ─────────────────────────────
// Lazy‑connected Redis client
// Re‑uses the same instance across imports/hot‑reloads
// ─────────────────────────────
const redis_1 = require("redis");
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
let client;
function getRedis() {
    if (client)
        return client; // already initialised
    client = (0, redis_1.createClient)({ url: REDIS_URL });
    // Optional: simple logging
    client.on('connect', () => console.log(`🟢  Redis connected  →  ${REDIS_URL}`));
    client.on('error', (err) => console.error('🔴  Redis client error:', err));
    // Connect in the background; callers can await ping if they need certainty
    client.connect().catch((err) => console.error('❌  Initial Redis connect failed:', err));
    return client;
}
exports.default = getRedis();
