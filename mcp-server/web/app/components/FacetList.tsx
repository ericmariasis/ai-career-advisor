'use client';

import { useState } from 'react';

export interface FacetBucket {
  value: string;
  count: number;
}

interface FacetListProps {
  title: string;
  facet: 'company' | 'skills';      // extend if you add more later
  buckets: FacetBucket[];           // already in /api/search response
  selected: string[];
  onChange: (facet: string, selected: string[]) => void;
  searchPlaceholder?: string;
  maxVisible?: number;
}

export default function FacetList({
  title,
  facet,
  buckets,
  selected,
  onChange,
  searchPlaceholder = `Search ${title.toLowerCase()}...`,
  maxVisible = 10,
}: FacetListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);

  const toggle = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter(x => x !== value)
      : [...selected, value];
    onChange(facet, next);
  };

  // Filter buckets based on search term
  const filteredBuckets = buckets.filter(bucket =>
    bucket.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Apply show more/less logic
  const visibleBuckets = searchTerm 
    ? filteredBuckets 
    : filteredBuckets.slice(0, showAll ? undefined : maxVisible);

  const hasMore = !searchTerm && filteredBuckets.length > maxVisible;

  if (buckets.length === 0) {
    return null; // Don't render if no data
  }

  return (
    <section className="mb-6">
      <h4 className="font-semibold mb-2 text-gray-900">{title}</h4>
      
      {/* Search box */}
      <input
        type="text"
        placeholder={searchPlaceholder}
        className="w-full text-xs px-2 py-1 border border-gray-300 rounded mb-2 text-gray-900"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      
      {/* Facet list */}
      <div className="max-h-48 overflow-y-auto">
        {visibleBuckets.map(bucket => (
          <label key={bucket.value} className="block text-sm py-1 text-gray-800 cursor-pointer">
            <input
              type="checkbox"
              className="mr-2 accent-indigo-500"
              checked={selected.includes(bucket.value)}
              onChange={() => toggle(bucket.value)}
            />
            <span className="truncate">{bucket.value}</span>
            <span className="ml-auto text-xs text-gray-500"> ({bucket.count})</span>
          </label>
        ))}
      </div>
      
      {/* Show more/less button */}
      {hasMore && (
        <button
          className="mt-2 text-xs text-indigo-500 hover:text-indigo-700 underline"
          onClick={() => setShowAll(prev => !prev)}
        >
          {showAll ? 'Show less…' : 'Show more…'}
        </button>
      )}
      
      {/* No results message */}
      {searchTerm && filteredBuckets.length === 0 && (
        <p className="text-xs text-gray-500 mt-2">No {title.toLowerCase()} found</p>
      )}
    </section>
  );
}