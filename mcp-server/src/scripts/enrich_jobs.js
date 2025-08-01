"use strict";
// scripts/enrich_jobs.ts
// ------------------------------------------------------------
// Nightly “data‑enrichment” worker.
//
// • Browses the Algolia “jobs” index for objects missing `skills_ai`
//   *or* whose `lastEnrichedAt` is older than 24 h.
// • Sends batches of 50 job descriptions to GPT‑4o.
// • Parses the JSON array → partial‑update each record.
// • Logs rejects to a lightweight backup index “jobs_enrich_errors”.
//
// Run once:  npx ts-node scripts/enrich_jobs.ts
// CI cron:   GitHub Action .github/workflows/enrich.yml
// ------------------------------------------------------------
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const argv = process.argv.slice(2);
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = argv.includes('--verbose');
const existsCache = new Set();
// new 👉 extract optional --jobs
let JOB_LIMIT;
for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--jobs')) {
        const val = argv[i].includes('=')
            ? argv[i].split('=')[1]
            : argv[i + 1]; // next token
        JOB_LIMIT = val ? Number(val) : undefined;
    }
}
if (DRY_RUN)
    console.log('🛈  DRY‑RUN: no OpenAI calls, no Algolia writes\n');
const algoliasearch_1 = __importDefault(require("algoliasearch"));
const redis_1 = require("redis");
const openai_1 = require("openai");
const embed_1 = require("../src/lib/embed");
const p_limit_1 = __importDefault(require("p-limit"));
const zod_1 = require("zod");
// ---------- 1. ENV -----------------------------------------------------------
const { ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY, OPENAI_API_KEY, REDIS_URL = 'redis://localhost:6379', 
// optional overrides
ENRICH_OPENAI_DOLLAR_CAP = '1.00', // ~$1/night default
ENRICH_BATCH_SIZE = '50', } = process.env;
if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY || !OPENAI_API_KEY) {
    console.error('❌ Missing env vars. Check ALGOLIA_* and OPENAI_API_KEY.');
    process.exit(1);
}
/* NEW 👉 spin up a single Redis connection (lazy) */
const redis = (0, redis_1.createClient)({ url: REDIS_URL });
// ---------- 2. Clients -------------------------------------------------------
const algolia = (0, algoliasearch_1.default)(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
const index = algolia.initIndex('jobs');
const errIdx = algolia.initIndex('jobs_enrich_errors');
const openai = new openai_1.OpenAI({ apiKey: OPENAI_API_KEY });
// ---------- 3. Schema for LLM output ----------------------------------------
const Enriched = zod_1.z.object({
    objectID: zod_1.z.string(),
    industry_ai: zod_1.z.string().optional(),
    skills_ai: zod_1.z.array(zod_1.z.string()).min(1),
    seniority_ai: zod_1.z.enum(['junior', 'mid', 'senior']),
    embedding: zod_1.z.array(zod_1.z.number()).length(1536).optional(), // 🆕
    lastEnrichedAt: zod_1.z.number().optional(), // 🆕 allow it
});
// ---------- 4. Helpers -------------------------------------------------------
const MAX_SPEND_USD = Number(ENRICH_OPENAI_DOLLAR_CAP);
const BATCH_SIZE = Number(ENRICH_BATCH_SIZE);
let spent = 0;
// ---------------------------------------
// 4. Helpers – small util
function needsEmbedding(rec) {
    return !Array.isArray(rec.embedding) || rec.embedding.length !== 1536;
}
/** Rough cost calc: $0.01 / 1K tokens GPT‑4o. */
function estimateCost(prompt, n = 1) {
    const tokens = Math.ceil(prompt.length / 4); // 4 chars ≈ 1 token
    return (tokens * 0.01) / 1000 * n;
}
function buildPrompt(jobs) {
    return `
  You are a data‑enrichment worker. For each job JSON, output **ONLY** an array
  in minified JSON. **Do NOT wrap the answer in back‑ticks or any markdown.**
  
  Schema per item:
    objectID        – string (copy from input)
    industry_ai     – short label
    skills_ai       – 5‑10 skill strings
    seniority_ai    – "junior" | "mid" | "senior"
  
  Input:
  ${JSON.stringify(jobs)}
  `.trim();
}
/** Enrich 1 batch (<=50) and return successful objects */
async function enrichBatch(batch) {
    var _a, _b;
    if (DRY_RUN) {
        const objects = batch.map((j) => ({
            objectID: j.objectID,
            industry_ai: 'TBD',
            skills_ai: [],
            seniority_ai: 'mid',
            lastEnrichedAt: Date.now(),
        }));
        return { objects, updatedIds: objects.map(o => o.objectID) };
    }
    const prompt = buildPrompt(batch);
    const est = estimateCost(prompt);
    if (spent + est > MAX_SPEND_USD) {
        console.warn(`💸 cap reached (spent $${spent.toFixed(2)} + $${est.toFixed(2)})`);
        return { objects: [], updatedIds: [] };
    }
    const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // cost‑effective tier
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }],
    });
    spent += est;
    const raw = (_a = res.choices[0].message.content) !== null && _a !== void 0 ? _a : '[]';
    const sanitized = raw.replace(/```[a-z]*\s*|```/gi, '');
    let parsed;
    try {
        parsed = JSON.parse(sanitized);
    }
    catch (e) {
        throw new Error(`JSON.parse failed: ${e.message}\n---\n${sanitized}`);
    }
    const objects = Enriched.array().parse(parsed);
    /* build a tiny lookup so we still have the text that came in with the batch   */
    const textById = new Map();
    batch.forEach((b) => {
        textById.set(b.objectID, [b.title, b.description].filter(Boolean).join('\n\n'));
    });
    /* ----------  vector embedding & Redis JSON ---------- */
    const pipe = redis.multi(); // 🆕 start pipeline
    const updatedIds = [];
    for (const obj of objects) {
        const key = `job:${obj.objectID}`;
        /** ----------------------------------------------------------
         * 1.  Does Redis already know this job?
         *     (we memoise the answer so we don’t hit the server twice)
         * --------------------------------------------------------- */
        let seen = existsCache.has(key);
        if (!seen) {
            seen = (await redis.exists(key)) === 1; // ← cast 0/1 → boolean
            if (seen)
                existsCache.add(key);
        }
        /** ----------------------------------------------------------
         * 2.  If we still need a vector → embed once
         * --------------------------------------------------------- */
        if (needsEmbedding(obj)) {
            const txt = (_b = textById.get(obj.objectID)) !== null && _b !== void 0 ? _b : '';
            const vec = await (0, embed_1.embedText)(txt); // Float32Array → number[]
            const arr = Array.from(vec);
            obj.embedding = arr; // for Algolia later
            spent += arr.length / 1000000;
            if (!seen) {
                /* ───────── first‑time import → write the WHOLE record ───────── */
                pipe.json.set(key, '$', {
                    ...batch.find(b => b.objectID === obj.objectID), // title, salary…
                    embedding: arr,
                    lastEnrichedAt: Date.now(),
                });
                existsCache.add(key);
            }
            else {
                /* ───────── overwrite just the two paths ───────── */
                pipe.json.set(key, '$.embedding', arr);
                pipe.json.set(key, '$.lastEnrichedAt', Date.now());
            }
        }
        else if (seen) {
            /* Already has a good vector → merely bump the timestamp */
            pipe.json.set(key, '$.lastEnrichedAt', Date.now());
        }
        updatedIds.push(obj.objectID);
    }
    if (updatedIds.length) {
        await pipe.exec(); // only fire when we queued something
    }
    return { objects, updatedIds };
}
// ---------- 5. Main ----------------------------------------------------------
async function main() {
    /* 0. connect Redis once, then timer */
    await redis.connect().catch(err => {
        console.error('❌ Redis connection failed:', err);
        process.exit(1);
    });
    console.log('🟢  Redis connected →', REDIS_URL);
    console.time('⏱  enrich');
    const yesterday = Date.now() - 86400000; // 24 h
    const toEnrich = [];
    // ① collect stale / missing‑vector objects
    await index.browseObjects({
        batch: objs => {
            objs.forEach(o => {
                var _a, _b;
                const rec = o;
                if (needsEmbedding(rec) ||
                    !rec.skills_ai ||
                    ((_a = rec.lastEnrichedAt) !== null && _a !== void 0 ? _a : 0) < yesterday) {
                    toEnrich.push({
                        objectID: rec.objectID,
                        title: rec.title,
                        description: rec.description,
                        embedding: (_b = rec.embedding) !== null && _b !== void 0 ? _b : null,
                    });
                }
            });
        },
        query: '',
        filters: '',
    });
    if (!toEnrich.length) {
        console.log('✨  Nothing to enrich today.');
        await redis.quit();
        return;
    }
    console.log(`📥  Need to enrich ${toEnrich.length} objects`);
    if (JOB_LIMIT) {
        console.log(`🔢  Limiting to first ${JOB_LIMIT} jobs (CLI flag)`);
        toEnrich.splice(JOB_LIMIT);
    }
    // ② batch & limit concurrency
    const limit = (0, p_limit_1.default)(2);
    const updates = [];
    const errors = [];
    await Promise.all(Array.from({ length: Math.ceil(toEnrich.length / BATCH_SIZE) }, (_, i) => limit(async () => {
        const slice = toEnrich.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
        try {
            const { objects: enriched, updatedIds } = await enrichBatch(slice);
            if (VERBOSE && updatedIds.length) {
                const preview = updatedIds.slice(0, 10).join(', ');
                console.log(`      ↳ ids: ${preview}${updatedIds.length > 10 ? '…' : ''}`);
            }
            enriched.forEach(o => updates.push({ ...o, lastEnrichedAt: Date.now() }));
            console.log(`   ✔ batch ${i + 1} OK (${enriched.length})`);
        }
        catch (err) {
            console.error(`   ✖ batch ${i + 1} failed:`, err.message);
            slice.forEach(o => errors.push({ ...o, error: err.message }));
        }
    })));
    // ③ write back
    if (!DRY_RUN && updates.length) {
        // strip the large vector before Algolia to save quota
        const slim = updates.map(({ embedding, ...rest }) => rest);
        await index.partialUpdateObjects(slim, { createIfNotExists: false });
    }
    if (!DRY_RUN && errors.length) {
        await errIdx.saveObjects(errors, { autoGenerateObjectIDIfNotExist: true });
    }
    console.timeEnd('⏱  enrich');
    console.log(`${DRY_RUN ? '[DRY] ' : ''}✅ ${updates.length} updated  | ❌ ${errors.length} errors | $${spent.toFixed(2)}`);
    await redis.quit();
}
main().catch(e => {
    console.error('UNHANDLED:', e);
    process.exit(1);
});
