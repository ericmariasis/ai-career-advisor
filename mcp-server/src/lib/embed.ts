// src/lib/embed.ts
import { OpenAI } from 'openai';

// 1️⃣ singleton client (so we don’t create one per call)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const MODEL  = 'text-embedding-ada-002';
const DIM    = 1536;                   // handy constant we’ll reuse

/** Return a Float32Array(1536) for arbitrary text. */
export async function embedText(text: string): Promise<Float32Array> {
  const { data } = await openai.embeddings.create({ model: MODEL, input: text });
  const vec = data[0].embedding;            // number[]
  if (vec.length !== DIM) throw new Error(`expected ${DIM} dims, got ${vec.length}`);
  return Float32Array.from(vec);
}
export { DIM };
