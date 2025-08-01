"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/lib/redis.ts
// ─────────────────────────────
// Lazy‑connected Redis client
// Re‑uses the same instance across imports/hot‑reloads
// ─────────────────────────────
const node_path_1 = require("node:path");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: (0, node_path_1.resolve)(__dirname, '../../.env') });
const redis_1 = require("redis");
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
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
