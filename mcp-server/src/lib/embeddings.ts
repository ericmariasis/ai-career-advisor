import OpenAI from 'openai';

/** Singleton OpenAI client (re‑use across imports) */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Embed a piece of text with `text‑embedding‑ada‑002`.
 * Returns a Float32Array of length 1536.
 */
export async function embedText(text: string): Promise<Float32Array> {
  const resp = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text
  });

  const raw = resp.data[0]?.embedding;
  if (!raw) throw new Error('Embedding API returned no data');

  // Convert number[] → Float32Array (handy later for Buffer.from)
  return Float32Array.from(raw);
}
