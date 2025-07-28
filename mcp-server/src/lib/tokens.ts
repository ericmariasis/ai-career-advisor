// src/lib/tokens.ts
/**
 * Ultra‑robust token estimator for OpenAI embeddings.
 *
 * • text‑embedding‑ada‑002 averages ≈ 4 characters per token on English prose.
 * • length ÷ 4 therefore guarantees an *upper‑bound* on tokens without crashing.
 * • Synchronous, zero‑dependency, handles strings *or* Buffers.
 */
export const countTokens = (input: string | Buffer): number => {
    const str = typeof input === 'string' ? input : input.toString('utf8');
    return Math.ceil(str.length / 4);
  };
  