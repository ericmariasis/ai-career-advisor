// app/auto-test/page.tsx
'use client';

import { useEffect } from 'react';

// Skip prerendering for this test page
export const dynamic = 'force-dynamic';

export default function Test() {
  useEffect(() => {
    (async () => {
      // Dynamic import to prevent server-side evaluation
      const { searchClient, indexName } = await import('../../lib/algolia');
      const { results } = await searchClient.search([
        { indexName, query: 'foo', params: { hitsPerPage: 1 } },
      ]);
      console.log(results);
    })();
  }, []);

  return null;
}
