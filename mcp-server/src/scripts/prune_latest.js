"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// scripts/prune_latest.ts
require("dotenv/config");
const algoliasearch_1 = __importDefault(require("algoliasearch")); // keep only the function
async function main() {
    var _a;
    // keep N newest (default 1 000)
    const KEEP = Number((_a = process.argv[2]) !== null && _a !== void 0 ? _a : 1000);
    // 0. env sanity‑check
    const { ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY } = process.env;
    if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) {
        throw new Error('Set ALGOLIA_APP_ID and ALGOLIA_ADMIN_KEY in your shell');
    }
    const client = (0, algoliasearch_1.default)(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
    const index = client.initIndex('jobs'); // fully functional
    const all = [];
    console.log('Browse all objects…');
    await index.browseObjects({
        query: '',
        batch: (hits) => all.push(...hits),
    });
    console.log(`Finished Browse ${all.length} objects.`);
    // 3. sort & figure out which to delete
    all.sort((a, b) => { var _a, _b; return Number((_a = b.lastEnrichedAt) !== null && _a !== void 0 ? _a : 0) - Number((_b = a.lastEnrichedAt) !== null && _b !== void 0 ? _b : 0); });
    const keep = new Set(all.slice(0, KEEP).map(h => h.objectID));
    const toDelete = all.filter(h => !keep.has(h.objectID)).map(h => h.objectID);
    if (toDelete.length === 0) {
        console.log('No older records to delete.');
        process.exit(0);
    }
    console.log(`Keeping ${keep.size} – deleting ${toDelete.length} older records…`);
    for (let i = 0; i < toDelete.length; i += 1000) {
        const chunk = toDelete.slice(i, i + 1000);
        await index.deleteObjects(chunk);
    }
    console.log('🎉 Prune job submitted – watch the “Tasks” tab in Algolia.');
} // ← ADD Line B
main().catch(err => { console.error(err); process.exit(1); });
