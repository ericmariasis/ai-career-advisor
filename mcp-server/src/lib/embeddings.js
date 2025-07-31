"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.embedText = embedText;
const openai_1 = __importDefault(require("openai"));
/** Singleton OpenAI client (re‑use across imports) */
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY
});
/**
 * Embed a piece of text with `text‑embedding‑ada‑002`.
 * Returns a Float32Array of length 1536.
 */
async function embedText(text) {
    var _a;
    const resp = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text
    });
    const raw = (_a = resp.data[0]) === null || _a === void 0 ? void 0 : _a.embedding;
    if (!raw)
        throw new Error('Embedding API returned no data');
    // Convert number[] → Float32Array (handy later for Buffer.from)
    return Float32Array.from(raw);
}
