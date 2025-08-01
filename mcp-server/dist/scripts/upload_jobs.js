#!/usr/bin/env ts-node
"use strict";
/**
 * Uploads jobs JSON → Algolia
 *
 *   # plain upload
 *   ts-node scripts/upload_jobs.ts
 *
 *   # upload + OpenAI embeddings
 *   ts-node scripts/upload_jobs.ts --embed
 *
 * ENV  (can go in .env):
 *   ALGOLIA_APP_ID=...
 *   ALGOLIA_ADMIN_KEY=...
 *   ALGOLIA_INDEX=jobs         # optional; default 'jobs'
 *   OPENAI_API_KEY=sk-...      # only needed with --embed
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const commander_1 = require("commander");
const dotenv_1 = require("dotenv");
const algoliasearch_1 = __importDefault(require("algoliasearch"));
const openai_1 = require("openai");
(0, dotenv_1.config)({ path: '.env' });
commander_1.program
    .option('-f, --file <path>', 'path to jobs JSON', 'jobs_seed.json')
    .option('-e, --embed', 'generate OpenAI embeddings')
    .parse(process.argv);
const { file, embed: shouldEmbed } = commander_1.program.opts();
/* ───────────────────────────────────────────────────────────── */
const { ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY, ALGOLIA_INDEX = 'jobs', OPENAI_API_KEY, } = process.env;
if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) {
    console.error('❌  Missing ALGOLIA_APP_ID / ALGOLIA_ADMIN_KEY env vars');
    process.exit(1);
}
if (shouldEmbed && !OPENAI_API_KEY) {
    console.error('❌  --embed passed but OPENAI_API_KEY not set');
    process.exit(1);
}
const algolia = (0, algoliasearch_1.default)(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
const index = algolia.initIndex(ALGOLIA_INDEX);
const openai = shouldEmbed ? new openai_1.OpenAI({ apiKey: OPENAI_API_KEY }) : undefined;
/* ───────────────────────────────────────────────────────────── */
const TAG_MAP = {
    remote: 'remote',
    senior: 'senior',
    'entry level': 'entry',
    contract: 'contract',
};
async function enrich(rec) {
    var _a, _b, _c, _d, _e;
    /* 1️⃣  Ensure required fields exist */
    (_a = rec.description) !== null && _a !== void 0 ? _a : (rec.description = `Description for ${rec.title || 'this role'} not provided.`);
    (_b = rec.applyUrl) !== null && _b !== void 0 ? _b : (rec.applyUrl = '');
    /* 2️⃣  Build tags */
    const tags = new Set((_c = rec.tags) !== null && _c !== void 0 ? _c : []);
    if (rec.industry)
        tags.add(String(rec.industry).toLowerCase());
    if ((_d = rec.location) === null || _d === void 0 ? void 0 : _d.toLowerCase().includes('remote'))
        tags.add('remote');
    const haystack = `${rec.title} ${rec.description}`.toLowerCase();
    for (const [needle, tag] of Object.entries(TAG_MAP)) {
        if (haystack.includes(needle))
            tags.add(tag);
    }
    rec.tags = Array.from(tags);
    /* 3️⃣  Normalize skills */
    rec.skills = Array.from(new Set(((_e = rec.skills) !== null && _e !== void 0 ? _e : []).map((s) => s.toLowerCase())));
    /* 4️⃣  Embedding (optional) */
    if (shouldEmbed && openai) {
        const text = `${rec.title}\n${rec.description}`.slice(0, 8192);
        const { data } = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text,
        });
        rec._vector = data[0].embedding; // Algolia will infer vector field
    }
    return rec;
}
/* ───────────────────────────────────────────────────────────── */
async function run() {
    const filePath = path_1.default.resolve(file);
    if (!fs_1.default.existsSync(filePath)) {
        console.error(`❌  File "${filePath}" not found`);
        process.exit(1);
    }
    const raw = fs_1.default.readFileSync(filePath, 'utf8');
    let jobs;
    try {
        jobs = JSON.parse(raw);
        if (!Array.isArray(jobs))
            throw new Error('JSON root is not array');
    }
    catch (e) {
        console.error('❌  jobs JSON must be an array:', e);
        process.exit(1);
    }
    console.log(`→ Processing ${jobs.length} job records${shouldEmbed ? ' with embeddings' : ''}…`);
    const BATCH_SIZE = 1000;
    let processed = 0;
    let batch = [];
    for (const job of jobs) {
        batch.push(await enrich(job));
        if (batch.length === BATCH_SIZE) {
            await index.saveObjects(batch, { autoGenerateObjectIDIfNotExist: true });
            processed += batch.length;
            console.log(`   ✔ indexed ${processed}/${jobs.length}`);
            batch.length = 0;
        }
    }
    /* flush remainder */
    if (batch.length) {
        await index.saveObjects(batch, { autoGenerateObjectIDIfNotExist: true });
        processed += batch.length;
        console.log(`   ✔ indexed ${processed}/${jobs.length}`);
    }
    console.log('✅  All jobs uploaded.');
}
run().catch((err) => {
    console.error(err);
    process.exit(1);
});
