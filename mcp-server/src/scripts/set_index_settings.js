#!/usr/bin/env ts-node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * scripts/set_index_settings.ts
 *
 * Usage:
 *   ts-node scripts/set_index_settings.ts
 *
 * ENV:
 *   ALGOLIA_APP_ID
 *   ALGOLIA_ADMIN_KEY
 *   ALGOLIA_INDEX     (optional; defaults to "jobs")
 */
const algoliasearch_1 = __importDefault(require("algoliasearch"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: '.env' });
const { ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY, ALGOLIA_INDEX = 'jobs', } = process.env;
// sanity-check
if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) {
    console.error('❌  ALGOLIA_APP_ID and ALGOLIA_ADMIN_KEY must be set in .env');
    process.exit(1);
}
// initialize client & index
const client = (0, algoliasearch_1.default)(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
const index = client.initIndex(ALGOLIA_INDEX);
(async () => {
    try {
        console.log(`→ Updating settings for index "${ALGOLIA_INDEX}"…`);
        await index.setSettings({
            // which attributes to search and in what order
            searchableAttributes: [
                'unordered(title)',
                'unordered(company)',
                'unordered(skills)',
                'unordered(tags)',
                'description',
            ],
            // allow filtering on these facets
            attributesForFaceting: [
                'tags',
                'location',
                'industry',
            ],
            // tie‐breakers when records have equal textual match
            customRanking: [
                'desc(salary_estimate)', // higher salary first
                'asc(title)', // then alphabetical
            ],
            // loosen typo rules to avoid false exclusions
            typoTolerance: 'min',
        });
        console.log('→ Updating synonyms…');
        // each needs a unique objectID
        const synonymsList = [
            { objectID: 'syn_ml', type: 'synonym', synonyms: ['ml', 'machine learning'] },
            { objectID: 'syn_ai', type: 'synonym', synonyms: ['ai', 'artificial intelligence'] },
        ];
        await index.replaceAllSynonyms(synonymsList, {
            replaceExistingSynonyms: true,
            forwardToReplicas: false,
        });
        console.log('✅  Synonyms successfully updated.');
        console.log('✅  Index settings successfully updated.');
    }
    catch (err) {
        console.error('❌  Failed to update settings:', err);
        process.exit(1);
    }
})();
