// components/SearchBar.tsx
'use client';

import React, { useEffect, useRef, createElement, Fragment } from 'react';
import { createRoot } from 'react-dom/client';
import { autocomplete, getAlgoliaResults } from '@algolia/autocomplete-js';
import '@algolia/autocomplete-theme-classic';
import { algoliasearch } from 'algoliasearch';
import { indexName } from '../../lib/algolia';
import { Job } from './JobCard';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onSelectHit?: (hit: Job) => void;
}

export default function SearchBar({ onSearch, onSelectHit }: SearchBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // ▼▼▼ ADD A REF TO HOLD THE REACT ROOT FOR THE PANEL ▼▼▼
  const panelRootRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const appId  = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
    const apiKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_ONLY_API_KEY;

    if (!appId || !apiKey) {
      console.error('Algolia env vars missing → Autocomplete disabled');
      return;
    }

    const client = algoliasearch(appId, apiKey);

    const panel = autocomplete({
      container:   containerRef.current,
      placeholder: 'Search job titles, skills…',
      openOnFocus: true,
      // ▼▼▼ ADD THE CUSTOM RENDERER AND RENDER FUNCTIONS ▼▼▼
      renderer: { createElement, Fragment },
      render({ children }, root) {
        if (!panelRootRef.current) {
          panelRootRef.current = createRoot(root);
        }
        panelRootRef.current.render(children);
      },
      getSources() {
        return [
          {
            sourceId: 'jobs',
            getItems({ query }) {
                return getAlgoliaResults({
                  searchClient: client,          // your v5 client
                  queries: [
                    { indexName, query, params: { hitsPerPage: 5 } },
                  ],
                });
              },
            templates: {
              item({ item, components }) {
                console.log('debug highlightResult', item._highlightResult?.title);
                return (
                  <div className="aa-ItemWrapper">
                    <div className="aa-ItemContent">
                      <div className="aa-ItemTitle">
                        <components.Highlight hit={item} attribute="title" />
                      </div>
                      <div className="aa-ItemDescription text-sm text-gray-500">
                        {(item as any).company} — {(item as any).location}
                      </div>
                    </div>
                  </div>
                );
              },
              noResults() {
                return <div className="aa-NoResults p-4">No jobs found.</div>;
              },
            },
            onSelect({ item, setIsOpen }) {
                onSelectHit?.(item as Job);
                onSearch((item as any).title);
                setIsOpen(false);
            },
          },
        ];
      },
    });

    return () => {
      panel.destroy();
      queueMicrotask(() => (panelRootRef.current = null));
    };
  }, [onSearch]);

  return <div ref={containerRef} className="w-full" />;
}