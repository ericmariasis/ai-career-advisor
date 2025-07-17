// app/auto-test/page.tsx
'use client';

import { useEffect } from 'react';
import { searchClient, indexName } from '../../lib/algolia';

export default function Test() {
  useEffect(() => {
    (async () => {
      const { results } = await searchClient.search([
        { indexName, query: 'foo', params: { hitsPerPage: 1 } },
      ]);
      console.log(results);
    })();
  }, []);

  return null;
}
