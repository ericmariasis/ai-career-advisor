// src/lib/algolia.ts
import algoliasearch from 'algoliasearch';
import { config } from 'dotenv';

config();

const appId = process.env.ALGOLIA_APP_ID!;
const apiKey = process.env.ALGOLIA_ADMIN_KEY!;
const indexName = process.env.ALGOLIA_INDEX ?? 'jobs';

if (!appId || !apiKey) {
  throw new Error('Missing ALGOLIA_APP_ID or ALGOLIA_ADMIN_KEY');
}

export const searchClient = algoliasearch(appId, apiKey);
export const jobsIndex = searchClient.initIndex(indexName); 