// components/SearchBar.tsx
'use client';

import React, { useEffect, useRef, useState,        
               createElement, Fragment } from 'react';
import { createRoot } from 'react-dom/client';
import { autocomplete } from '@algolia/autocomplete-js';
import '@algolia/autocomplete-theme-classic';


import type { Job } from '../types/job';

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
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null); 

  useEffect(() => {
    if (!containerRef.current) return;

    const initializeAutocomplete = async () => {

    const panel = autocomplete({
      container:   containerRef.current!,
      placeholder: 'Search job titles, skills…',
      openOnFocus: true,
      id: 'job-search-input',
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
      /* fire parent search when user submits */
      onSubmit({ state }) {
        const query = state.query.trim();
        if (query) {
          onSearch(query);                         // ➕ trigger main search
        }
      },
      /* fire parent search as user types (debounced) */
      onStateChange({ state }) {
        const query = state.query.trim();
        
        // Clear existing timeout
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
        
        // Set new timeout for debounced search
        searchTimeoutRef.current = setTimeout(() => {
          onSearch(query); // Trigger search even with empty query to show all results
        }, 300); // 300ms debounce
      },
      getSources() {
        return [
          {
            sourceId: 'jobs',
            async getItems({ query }) {
                if (!query) return [];
                
                try {
                  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&hitsPerPage=5`);
                  const data = await response.json();
                  return data.hits || [];
                } catch (error) {
                  console.error('Search autocomplete failed:', error);
                  return [];
                }
              },
            templates: {
              item({ item }) {
                const hit = item as unknown as SearchHit;
                return (
                  <div className="aa-ItemWrapper">
                    <div className="aa-ItemContent">
                      <div className="aa-ItemTitle">
                        {hit.title}
                      </div>
                      <div className="aa-ItemDescription text-sm text-gray-700">
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
                onSelectHit?.(item as unknown as Job);
                onSearch((item as unknown as SearchHit).title);
                setIsOpen(false);
            },
          },
        ];
      },
    });

        // keep a handle so the clear‑button can call panelRef.current.reset()
        panelRef.current = panel;               // ➕ store reference
        
        // Add ID to the input element for keyboard shortcut targeting
        setTimeout(() => {
          const input = containerRef.current?.querySelector('input');
          if (input) {
            input.id = 'job-search-input';
          }
        }, 100);
    
        return () => {
          // Clear any pending search timeout
          if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
          }
          
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