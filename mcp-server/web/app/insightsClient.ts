'use client';
import aa from 'search-insights';

/* one-time init during Fast-Refresh */
if (!(globalThis as any)._algoliaInsightsInit) {
  aa('init', {
    appId:  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
    apiKey: process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!,   // search-only key
    useCookie: true,      // lets Algolia set an anonymous userToken cookie
  });
  (globalThis as any)._algoliaInsightsInit = true;
}

/* ----------  ★ NEW helper so cards can grab userToken  ---------- */
export function getUserToken(): string {
  const token = aa('getUserToken') as string | undefined;
  return token ?? 'unknown-user';
}

export default aa;
