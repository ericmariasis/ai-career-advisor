#!/usr/bin/env ts-node
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

import fs from 'fs';
import path from 'path';
import { program } from 'commander';
import { config as loadEnv } from 'dotenv';
import algoliasearch from 'algoliasearch';
import { OpenAI } from 'openai';

loadEnv({ path: '.env' });

program
  .option('-f, --file <path>', 'path to jobs JSON', 'jobs_seed.json')
  .option('-e, --embed', 'generate OpenAI embeddings')
  .parse(process.argv);

const { file, embed: shouldEmbed } = program.opts<{
  file: string;
  embed: boolean;
}>();

/* ───────────────────────────────────────────────────────────── */

const {
  ALGOLIA_APP_ID,
  ALGOLIA_ADMIN_KEY,
  ALGOLIA_INDEX = 'jobs',
  OPENAI_API_KEY,
} = process.env;

if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) {
  console.error('❌  Missing ALGOLIA_APP_ID / ALGOLIA_ADMIN_KEY env vars');
  process.exit(1);
}
if (shouldEmbed && !OPENAI_API_KEY) {
  console.error('❌  --embed passed but OPENAI_API_KEY not set');
  process.exit(1);
}

const algolia = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
const index   = algolia.initIndex(ALGOLIA_INDEX);
const openai  = shouldEmbed ? new OpenAI({ apiKey: OPENAI_API_KEY }) : undefined;

/* ───────────────────────────────────────────────────────────── */

const TAG_MAP: Record<string, string> = {
  remote: 'remote',
  senior: 'senior',
  'entry level': 'entry',
  contract: 'contract',
};

type JobRec = Record<string, any>;

async function enrich(rec: JobRec): Promise<JobRec> {
  /* 1️⃣  Ensure required fields exist */
  rec.description ??= `Description for ${rec.title || 'this role'} not provided.`;
  rec.applyUrl    ??= '';

  /* 2️⃣  Build tags */
  const tags = new Set<string>(rec.tags ?? []);
  if (rec.industry) tags.add(String(rec.industry).toLowerCase());
  if (rec.location?.toLowerCase().includes('remote')) tags.add('remote');

  const haystack = `${rec.title} ${rec.description}`.toLowerCase();
  for (const [needle, tag] of Object.entries(TAG_MAP)) {
    if (haystack.includes(needle)) tags.add(tag);
  }
  rec.tags = Array.from(tags);

  /* 3️⃣  Normalize skills */
  rec.skills = Array.from(
    new Set((rec.skills ?? []).map((s: string) => s.toLowerCase()))
  );

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
  const filePath = path.resolve(file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌  File "${filePath}" not found`);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  let jobs: JobRec[];
  try {
    jobs = JSON.parse(raw);
    if (!Array.isArray(jobs)) throw new Error('JSON root is not array');
  } catch (e) {
    console.error('❌  jobs JSON must be an array:', e);
    process.exit(1);
  }

  console.log(`→ Processing ${jobs.length} job records${shouldEmbed ? ' with embeddings' : ''}…`);

  const BATCH_SIZE = 1000;
  let processed = 0;
  let batch: JobRec[] = [];

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
