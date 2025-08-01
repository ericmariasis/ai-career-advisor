"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIM = void 0;
exports.embedText = embedText;
// src/lib/embed.ts
const openai_1 = require("openai");
// 1️⃣ singleton client (so we don’t create one per call)
const openai = new openai_1.OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = 'text-embedding-ada-002';
const DIM = 1536; // handy constant we’ll reuse
exports.DIM = DIM;
/** Return a Float32Array(1536) for arbitrary text. */
async function embedText(text) {
    const { data } = await openai.embeddings.create({ model: MODEL, input: text });
    const vec = data[0].embedding; // number[]
    if (vec.length !== DIM)
        throw new Error(`expected ${DIM} dims, got ${vec.length}`);
    return Float32Array.from(vec);
}
