'use client';
import aa from 'search-insights';

/* one-time init during Fast-Refresh */
if (!(globalThis as { _algoliaInsightsInit?: boolean })._algoliaInsightsInit) {
  aa('init', {
    appId:  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
    apiKey: process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_ONLY_API_KEY!,   // search-only key
    useCookie: true,      // lets Algolia set an anonymous userToken cookie
  });
  (globalThis as { _algoliaInsightsInit?: boolean })._algoliaInsightsInit = true;
}

/* ----------  ★ NEW helper so cards can grab userToken  ---------- */
export function getUserToken(): string {
  try {
    // • new SDKs expose aa.getUserToken()
    // • older ones use the command syntax: aa('getUserToken')
    // • neither has proper typings yet → cast to any
    const token =
      (aa as { getUserToken?: () => string }).getUserToken?.() ??
      (aa as (command: string) => string)('getUserToken')

    if (typeof token === 'string' && token.length) return token
  } catch {
    /* ignore */
  }
  return 'unknown-user'
}

export default aa;
