// components/SearchBar.tsx
'use client';

import React, { useEffect, useRef, useState,        
               createElement, Fragment } from 'react';
import { createRoot } from 'react-dom/client';
import { autocomplete, getAlgoliaResults } from '@algolia/autocomplete-js';
import '@algolia/autocomplete-theme-classic';
import { algoliasearch } from 'algoliasearch';
import { indexName } from '../../lib/algolia';
import { Job } from './JobCard';

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
  const inputRef     = useRef<HTMLInputElement | null>(null);   // 🆕 native <input>
  const panelRef     = useRef<ReturnType<typeof autocomplete>>(); // 🆕 store panel
  // ▼▼▼ ADD A REF TO HOLD THE REACT ROOT FOR THE PANEL ▼▼▼
  const panelRootRef = useRef<any>(null);
  const [query, setQuery] = useState(''); 

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

        // keep a handle so the clear‑button can call panelRef.current.reset()
        panelRef.current = panel;               // ➕ store reference
    
        return () => {
          panel.destroy();
          queueMicrotask(() => (panelRootRef.current = null));
          panelRef.current = undefined;         // ➕ clear ref on unmount
        };
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
            panelRef.current?.reset();       // triggers onReset
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}