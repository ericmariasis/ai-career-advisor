"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureCacheIndex = ensureCacheIndex;
// src/lib/createCacheIndex.ts
const redis_1 = __importDefault(require("./redis")); // adjust path to your singleton
async function ensureCacheIndex() {
    try {
        await redis_1.default.ft.info('cacheIdx'); // will throw if index absent
    }
    catch {
        console.log('[cacheIdx] creating RedisSearch index …');
        // Use string literals for field types to avoid import issues
        await redis_1.default.ft.create('cacheIdx', {
            '$.task': { type: 'TAG', AS: 'task' },
            '$.embedding': {
                type: 'VECTOR',
                AS: 'embedding',
                ALGORITHM: 'HNSW',
                TYPE: 'FLOAT32',
                DIM: 1536,
                DISTANCE_METRIC: 'COSINE'
            },
            '$.timestamp': { type: 'NUMERIC', AS: 'timestamp' }
        }, { ON: 'JSON', PREFIX: 'cache:' });
    }
}
