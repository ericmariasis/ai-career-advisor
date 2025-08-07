'use client';
import aa from 'search-insights';

/* one-time init during Fast-Refresh */
if (!(globalThis as { _algoliaInsightsInit?: boolean })._algoliaInsightsInit) {
  // Try NEXT_PUBLIC_ prefixed variables first, then fall back to non-prefixed
  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || process.env.ALGOLIA_APP_ID;
  const apiKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_ONLY_API_KEY || process.env.ALGOLIA_SEARCH_KEY;
  
  if (appId && apiKey) {
    aa('init', {
      appId: appId,
      apiKey: apiKey,   // search-only key
      useCookie: true,      // lets Algolia set an anonymous userToken cookie
    });
    (globalThis as { _algoliaInsightsInit?: boolean })._algoliaInsightsInit = true;
    console.log('✅ Algolia analytics initialized successfully');
  } else {
    console.warn('⚠️ Algolia analytics not initialized: Missing appId or apiKey environment variables');
    console.warn('Expected: NEXT_PUBLIC_ALGOLIA_APP_ID or ALGOLIA_APP_ID');
    console.warn('Expected: NEXT_PUBLIC_ALGOLIA_SEARCH_ONLY_API_KEY or ALGOLIA_SEARCH_KEY');
  }
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
