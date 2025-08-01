// web/lib/algolia.ts
// eslint-disable-next-line @typescript-eslint/no-require-imports
const algoliasearch = require('algoliasearch');

export const appId     = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!;
export const searchKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_ONLY_API_KEY!;
export const indexName = process.env.NEXT_PUBLIC_ALGOLIA_INDEX ?? 'jobs';

if (!appId || !searchKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_ALGOLIA_APP_ID or NEXT_PUBLIC_ALGOLIA_SEARCH_ONLY_API_KEY',
  );
}

export const searchClient = algoliasearch(appId, searchKey);
export const jobsIndex    = searchClient.initIndex(indexName);
