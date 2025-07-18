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

import 'dotenv/config';

const DRY_RUN = process.argv.includes('--dry-run');
if (DRY_RUN) console.log('🛈  DRY‑RUN: no OpenAI calls, no Algolia writes\n');

import algoliasearch, { SearchClient } from 'algoliasearch';
import { OpenAI } from 'openai';
import pLimit from 'p-limit';
import { z } from 'zod';

// ---------- 1. ENV -----------------------------------------------------------
const {
  ALGOLIA_APP_ID,
  ALGOLIA_ADMIN_KEY,
  OPENAI_API_KEY,
  // optional overrides
  ENRICH_OPENAI_DOLLAR_CAP = '1.00',     // ~$1/night default
  ENRICH_BATCH_SIZE        = '50',
} = process.env;

if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY || !OPENAI_API_KEY) {
  console.error('❌ Missing env vars. Check ALGOLIA_* and OPENAI_API_KEY.');
  process.exit(1);
}

// ---------- 2. Clients -------------------------------------------------------
const algolia: SearchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
const index  = algolia.initIndex('jobs');
const errIdx = algolia.initIndex('jobs_enrich_errors');

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ---------- 3. Schema for LLM output ----------------------------------------
const Enriched = z.object({
    objectID     : z.string(),
    industry_ai  : z.string().optional(),
    skills_ai    : z.array(z.string()).min(1),
    seniority_ai : z.enum(['junior', 'mid', 'senior']),
    lastEnrichedAt: z.number().optional(),   // 🆕 allow it
  });
type Enriched = z.infer<typeof Enriched>;

// ---------- 4. Helpers -------------------------------------------------------
const MAX_SPEND_USD = Number(ENRICH_OPENAI_DOLLAR_CAP);
const BATCH_SIZE    = Number(ENRICH_BATCH_SIZE);
let   spent         = 0;

/** Rough cost calc: $0.01 / 1K tokens GPT‑4o. */
function estimateCost(prompt: string, n = 1) {
  const tokens = Math.ceil(prompt.length / 4);       // 4 chars ≈ 1 token
  return (tokens * 0.01) / 1000 * n;
}

function buildPrompt(jobs: any[]): string {
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
async function enrichBatch(batch: any[]) {

    if (DRY_RUN) {
        return batch.map((j) => ({
          objectID      : j.objectID,
          industry_ai   : 'TBD',
          skills_ai     : [],
          seniority_ai  : 'mid',
          lastEnrichedAt: Date.now(),
        })) satisfies Enriched[];
      }
  const prompt = buildPrompt(batch);
  const est    = estimateCost(prompt);

  if (spent + est > MAX_SPEND_USD) {
    console.warn(`💸 cap reached (spent $${spent.toFixed(2)} + $${est.toFixed(2)})`);
    return [];
  }

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',            // cost‑effective tier
    temperature: 0.2,
    messages: [{ role: 'user', content: prompt }],
  });

  spent += est;

  const raw = res.choices[0].message.content ?? '[]';
  const sanitized = raw.replace(/```[a-z]*\s*|```/gi, '');
  let parsed: unknown;

  try {
    parsed = JSON.parse(sanitized);
  } catch (e) {
    throw new Error(`JSON.parse failed: ${(e as Error).message}\n---\n${sanitized}`);
  }

  const objects: Enriched[] = Enriched.array().parse(parsed);
  return objects;
}

// ---------- 5. Main ----------------------------------------------------------
async function main() {
  console.time('⏱  enrich');

  const yesterday = Date.now() - 86_400_000;  // 24 h
  const toEnrich: any[] = [];

  // ① Collect stale objects
  await index.browseObjects({
    batch: objects => {
        objects.forEach(obj => {
            const rec = obj as any;                      // 👈 cast
            if (!rec.skills_ai || (rec.lastEnrichedAt ?? 0) < yesterday) {
              toEnrich.push({
                objectID   : rec.objectID,
                title      : rec.title,
                description: rec.description,
              });
            }
          });
          
    },
    query: '',
    filters: '',     // you can add custom filters if needed
  });

  if (!toEnrich.length) {
    console.log('✨   Nothing to enrich today.');
    return;
  }

  console.log(`📥  Need to enrich ${toEnrich.length} objects`);

  // ② Batch + limit concurrency (2 parallel calls)
  const limit   = pLimit(2);
  const updates: Enriched[] = [];
  const errors : any[]      = [];

  await Promise.all(
    Array.from({ length: Math.ceil(toEnrich.length / BATCH_SIZE) }, (_, i) =>
      limit(async () => {
        const slice = toEnrich.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
        try {
          const enriched = await enrichBatch(slice);
          enriched.forEach(o => updates.push({
            ...o,
            lastEnrichedAt: Date.now(),
          }));
          console.log(`   ✔ batch ${i + 1} OK (${enriched.length})`);
        } catch (err: any) {
          console.error(`   ✖ batch ${i + 1} failed:`, err.message);
          slice.forEach(o => errors.push({ ...o, error: err.message }));
        }
      }),
    ),
  );

  // ③ Push updates / errors
  if (!DRY_RUN && updates.length) {
    await index.partialUpdateObjects(updates, { createIfNotExists: false });
  }
  if (!DRY_RUN && errors.length) {
    await errIdx.saveObjects(errors, { autoGenerateObjectIDIfNotExist: true });
  }

  console.timeEnd('⏱  enrich');
  console.log(
    `${DRY_RUN ? '[DRY] ' : ''}✅ ${updates.length} updated  | ❌ ${errors.length
    } errors | $${spent.toFixed(2)}`,
  );
}

main().catch(e => {
  console.error('UNHANDLED:', e);
  process.exit(1);
});
