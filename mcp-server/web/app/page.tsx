/* eslint-disable react-hooks/exhaustive-deps */
'use client';
import { useState, useEffect } from 'react';
import type { Job } from './components/JobCard';
import axios from 'axios';
import SearchBar  from './components/SearchBar';
import JobCard    from './components/JobCard';
import Pagination from './components/Pagination';

type AlgoliaResponse = {
  hits: Job[];
  nbHits: number;
  page: number;
  nbPages: number;
  queryID: string;
};

export default function Home() {
  const [query, setQuery]     = useState('');
  const [page,  setPage]      = useState(0);
  const [result, setResult]   = useState<AlgoliaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedSet, setSaved]  = useState<Set<string>>(new Set());  // ★ NEW

  /* ---------------- search helper ---------------- */
  async function search(q: string, page = 0) {
    setLoading(true);
    try {
      const { data } = await axios.get<AlgoliaResponse>('/api/search', {
        params: { q, page, hitsPerPage: 10 },
      });
      setResult(data);
      setQuery(q);
      setPage(page);
    } finally {
      setLoading(false);
    }
  }

  /* bubble up save / unsave from JobCard */
  function handleToggle(id: string, saved: boolean) {
    setSaved((prev) => {
      const next = new Set(prev);
      saved ? next.add(id) : next.delete(id);
      return next;
    });
  }

  useEffect(() => { search(''); }, []);

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">AI Job Explorer</h1>

      <SearchBar onSearch={(term) => search(term, 0)} />

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
                job={{ ...job, __position: page * 10 + idx + 1 }}
                queryID={result.queryID}
                initiallySaved={savedSet.has(job.objectID)}     // ★ NEW
                onToggle={handleToggle}                         // ★ NEW
              />
            ))}
          </div>

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
