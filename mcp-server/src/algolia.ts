import 'dotenv/config';
import algoliasearch, { SearchClient, SearchIndex } from 'algoliasearch';

const appId  = process.env.ALGOLIA_APP_ID!;
const apiKey = process.env.ALGOLIA_SEARCH_KEY    // safer than ADMIN
               ?? process.env.ALGOLIA_ADMIN_KEY!;

if (!appId || !apiKey) {
  throw new Error('Missing Algolia creds in .env');
}

export const algolia: SearchClient = algoliasearch(appId, apiKey);
export const jobsIndex: SearchIndex = algolia.initIndex('jobs');
