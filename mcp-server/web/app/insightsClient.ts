// app/insightsClient.ts
'use client';
import aa from 'search-insights';

const INSIGHTS_ALREADY_INITED = (globalThis as any)._algoliaInsightsInit;

if (!INSIGHTS_ALREADY_INITED) {
  aa('init', {
    appId:   process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
    apiKey:  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!, // **search-only key**
    useCookie: true,             // lets Algolia create an anon userToken
  });

  // mark so we don’t init twice on React Fast Refresh
  (globalThis as any)._algoliaInsightsInit = true;
}

export default aa;
