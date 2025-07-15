#!/usr/bin/env ts-node
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
import algoliasearch from 'algoliasearch';
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env' });

const {
  ALGOLIA_APP_ID,
  ALGOLIA_ADMIN_KEY,
  ALGOLIA_INDEX = 'jobs',
} = process.env;

// sanity-check
if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) {
  console.error('❌  ALGOLIA_APP_ID and ALGOLIA_ADMIN_KEY must be set in .env');
  process.exit(1);
}

// initialize client & index
const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
const index  = client.initIndex(ALGOLIA_INDEX);

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
        'filterOnly(tags)',
        'filterOnly(location)',
        'filterOnly(industry)',
      ],
      // tie‐breakers when records have equal textual match
      customRanking: [
        'desc(salary_estimate)',  // higher salary first
        'asc(title)',             // then alphabetical
      ],
      // loosen typo rules to avoid false exclusions
      typoTolerance: 'min',
    });
    console.log('→ Updating synonyms…');

    // each needs a unique objectID
    const synonymsList = [
      { objectID: 'syn_ml', type: 'synonym' as const, synonyms: ['ml','machine learning'] },
      { objectID: 'syn_ai', type: 'synonym' as const, synonyms: ['ai','artificial intelligence'] },
    ];

    await index.replaceAllSynonyms(synonymsList, {
      replaceExistingSynonyms: true,
      forwardToReplicas: false,
    });

    console.log('✅  Synonyms successfully updated.');
    console.log('✅  Index settings successfully updated.');
  } catch (err) {
    console.error('❌  Failed to update settings:', err);
    process.exit(1);
  }
})();
