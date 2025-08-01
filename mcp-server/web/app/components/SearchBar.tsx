// components/SearchBar.tsx
'use client';

import React, { useEffect, useRef, useState,        
               createElement, Fragment } from 'react';
import { createRoot } from 'react-dom/client';
import { autocomplete, getAlgoliaResults } from '@algolia/autocomplete-js';
import '@algolia/autocomplete-theme-classic';

// Dynamic import for algolia to prevent SSR issues
import { Job } from './JobCard';

interface SearchHit extends Job {
  company: string;
  location: string;
  title: string;
}

interface SearchBarProps {
  onSearch: (query: string) => void;
  onSelectHit?: (hit: Job) => void;
  onClear?: () => void;
}

export default function SearchBar({              
    onSearch,
    onSelectHit,
    onClear,
  }: SearchBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef     = useRef<ReturnType<typeof autocomplete> | null>(null); // 🆕 store panel
  // ▼▼▼ ADD A REF TO HOLD THE REACT ROOT FOR THE PANEL ▼▼▼
  const panelRootRef = useRef<ReturnType<typeof createRoot> | null>(null);
  const [query] = useState(''); 

  useEffect(() => {
    if (!containerRef.current) return;

    const initializeAutocomplete = async () => {
      const appId  = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
      const apiKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_ONLY_API_KEY;

      if (!appId || !apiKey) {
        console.error('Algolia env vars missing → Autocomplete disabled');
        return;
      }

      // Dynamic imports to prevent SSR issues
      const { indexName } = await import('../../lib/algolia');
      
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const algolia = require('algoliasearch');
      const client = algolia(appId, apiKey);

    const panel = autocomplete({
      container:   containerRef.current!,
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
            /* fire parent reset when we clear */
      onReset() {
        onClear?.();                               // ➕ notify page
      },
      getSources() {
        return [
          {
            sourceId: 'jobs',
            getItems({ query }) {
                return getAlgoliaResults({
                  searchClient: client,          // your v5 client
                  queries: [
                    { 
                      indexName: indexName, 
                      params: { 
                        query: query || '', 
                        hitsPerPage: 5 
                      } 
                    },
                  ],
                });
              },
            templates: {
              item({ item, components }) {
                const hit = item as unknown as SearchHit;
                return (
                  <div className="aa-ItemWrapper">
                    <div className="aa-ItemContent">
                      <div className="aa-ItemTitle">
                        <components.Highlight hit={item} attribute="title" />
                      </div>
                      <div className="aa-ItemDescription text-sm text-gray-500">
                        {hit.company} — {hit.location}
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
                onSearch((item as unknown as SearchHit).title);
                setIsOpen(false);
            },
          },
        ];
      },
    });

        // keep a handle so the clear‑button can call panelRef.current.reset()
        panelRef.current = panel;               // ➕ store reference
    
        return () => {
          panel.destroy();
          queueMicrotask(() => (panelRootRef.current = null));
          panelRef.current = null;         // ➕ clear ref on unmount
        };
      };

      // Call the async initialization function
      initializeAutocomplete();
      /**
       * ‼️  Important: this effect should run only once (mount / unmount).
       *      If it re‑runs on every re‑render, Autocomplete mounts a
       *      second React root on the same DOM node → the warning you saw.
       */
      }, []);                                   // ✏️ was  [onSearch]

    /* ------- CLEAR-BUTTON UI -------- */
  return (
    <div className="relative">
      <div ref={containerRef} className="w-full" />
      {query && (
        <button
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
          onClick={() => {
            panelRef.current?.setQuery('');  // wipe store
            onClear?.();                     // triggers onClear callback
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}