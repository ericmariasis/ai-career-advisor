/* eslint-disable react-hooks/exhaustive-deps */
'use client';
import { useState, useEffect } from 'react';
import type { Job } from './components/JobCard';
import axios from 'axios';
import SearchBar from './components/SearchBar';
import JobCard from './components/JobCard';
import Pagination from './components/Pagination';       // NEW ←

type AlgoliaResponse = {
  hits: Job[];
  nbHits: number;
  page: number;
  nbPages: number;
  queryID: string;
};

export default function Home() {
  const [query, setQuery] = useState('');                   // NEW: track the term
  const [page,  setPage]  = useState(0);                    // NEW: track the page
  const [result, setResult]   = useState<AlgoliaResponse | null>(null);
  const [loading, setLoading] = useState(false);

  /* ---------------- core search helper ---------------- */
  const search = async (q: string, page = 0) => {
    setLoading(true);
    try {
      const { data } = await axios.get<AlgoliaResponse>('/api/search', {
        params: { q, page, hitsPerPage: 10 },
      });
      setResult(data);
      setQuery(q);          // NEW: remember last query
      setPage(page);        // NEW
    } catch (err) {
      console.error(err);
      alert('Search failed.');
    } finally {
      setLoading(false);
    }
  };

  // initial load (optional)
  useEffect(() => {
    search('');
  }, []);

  /* ---------------- component output ---------------- */
  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">AI Job Explorer</h1>

      {/* call search(term, 0) so we reset to first page on a new query */}
      <SearchBar onSearch={term => search(term, 0)} />

      {loading && <p>Loading…</p>}

      {result && (
        <>
          <p className="text-sm text-gray-500">
            {result.nbHits.toLocaleString()} jobs found
          </p>

          <div className="grid gap-4">
                      {result.hits.map((job, idx) => (
              <JobCard
                key={job.objectID}
                job={job}
                queryID={result.queryID}
                position={page * 10 + idx + 1}   // 1-based absolute pos
              />
            ))}
          </div>

          {/* ---------- NEW: Pagination ---------- */}
          {result.nbPages > 1 && (
            <Pagination
              page={page}
              nbPages={result.nbPages}
              onPage={(p) => search(query, p)}
            />
          )}
        </>
      )}
    </main>
  );
}
