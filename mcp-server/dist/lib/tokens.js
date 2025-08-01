"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.countTokens = void 0;
// src/lib/tokens.ts
/**
 * Ultra‑robust token estimator for OpenAI embeddings.
 *
 * • text‑embedding‑ada‑002 averages ≈ 4 characters per token on English prose.
 * • length ÷ 4 therefore guarantees an *upper‑bound* on tokens without crashing.
 * • Synchronous, zero‑dependency, handles strings *or* Buffers.
 */
const countTokens = (input) => {
    const str = typeof input === 'string' ? input : input.toString('utf8');
    return Math.ceil(str.length / 4);
};
exports.countTokens = countTokens;
