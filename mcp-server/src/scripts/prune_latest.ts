// scripts/prune_latest.ts
import 'dotenv/config';
import algoliasearch from 'algoliasearch';       // keep only the function
import type { JobHit } from '../types'; // Assuming JobHit is defined here

async function main() {  

// keep N newest (default 1 000)
const KEEP = Number(process.argv[2] ?? 1_000);

// 0. env sanity‑check
const { ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY } = process.env;
if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) {
  throw new Error('Set ALGOLIA_APP_ID and ALGOLIA_ADMIN_KEY in your shell');
}

const client = algoliasearch(ALGOLIA_APP_ID!, ALGOLIA_ADMIN_KEY!);
const index  = client.initIndex('jobs');                // fully functional

const all: JobHit[] = [];
console.log('Browse all objects…');

await index.browseObjects({
  query: '',
  batch: (hits: readonly JobHit[]) => all.push(...hits),
});

console.log(`Finished Browse ${all.length} objects.`);

// 3. sort & figure out which to delete
all.sort((a, b) =>
      Number(b.lastEnrichedAt ?? 0) - Number(a.lastEnrichedAt ?? 0)
    );

const keep = new Set(all.slice(0, KEEP).map(h => h.objectID));
const toDelete = all.filter(h => !keep.has(h.objectID)).map(h => h.objectID);

if (toDelete.length === 0) {
    console.log('No older records to delete.');
    process.exit(0);
}

console.log(`Keeping ${keep.size} – deleting ${toDelete.length} older records…`);

for (let i = 0; i < toDelete.length; i += 1_000) {
      const chunk = toDelete.slice(i, i + 1_000);
      await index.deleteObjects(chunk);
    }

console.log('🎉 Prune job submitted – watch the “Tasks” tab in Algolia.');

}                                           // ← ADD Line B

main().catch(err => { console.error(err); process.exit(1); });