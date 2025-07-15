/* eslint-disable react-hooks/exhaustive-deps */
'use client';
import { useState, useEffect } from 'react';
import type { Job } from './components/JobCard';
import JobModal from './components/JobModal'; 
import axios from 'axios';
import SearchBar  from './components/SearchBar';
import JobCard    from './components/JobCard';
import Pagination from './components/Pagination';
import ResumeForm from './components/ResumeForm';
import { getUserToken } from './insightsClient';

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
  const [savedSet, setSaved]  = useState<Set<string>>(new Set());
  const [resumeSkills, setResumeSkills] = useState<string[]>([]);
  const [resumeHits,   setResumeHits]   = useState<Job[]>([]);
  const [selectedJob,  setSelectedJob]  = useState<Job | null>(null);
  const [tag, setTag] = useState('');


  /* ---------------- search helper ---------------- */
  async function search(q: string, page = 0, tag = '') {
    setLoading(true);
    try {
      const { data } = await axios.get<AlgoliaResponse>('/api/search', {
        params: { q, page, tag, hitsPerPage: 10},
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

  async function toggleFavorite(job: Job, save: boolean) {
    try {
      await axios.post('/api/favorites', {
        objectID: job.objectID,
        // these two are optional when saving from a modal
        queryID: job.__queryID ?? '',
        position: job.__position ?? 0,
        userToken: getUserToken(),
        save,
      });
      handleToggle(job.objectID, save);           // keep global state in sync
    } catch (err) {
      console.error('Could not toggle favourite', err);
    }
  }
  
  useEffect(() => { search('', 0, tag); }, [tag]);

    useEffect(() => {
        const fetchSaved = async () => {
          try {
            const { data } = await axios.get<{ ids: string[] }>('/api/favorites', {
              params: { userToken: getUserToken() },
            });
            setSaved(new Set(data.ids));
          } catch (err) {
            console.error('Could not load favourites', err);
          }
        };
        fetchSaved();
      }, []);

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
       <header className="flex items-baseline gap-6">
   <h1 className="text-2xl font-bold">AI Job Explorer</h1>

   {/* Saved-jobs link */}
   <a
     href="/saved"
     className="text-sm text-indigo-400 hover:text-indigo-300 underline"
   >
     Saved&nbsp;Jobs
   </a>
 </header>
 <div className="flex items-center gap-2">
  <label className="text-sm text-gray-400">Filter:</label>
  <select
    value={tag}
    onChange={(e) => {
      const val = e.target.value;
      setTag(val);
      search(query, 0, val);           // reset page when tag changes
    }}
    className="rounded bg-zinc-800 px-2 py-1 text-sm"
  >
    <option value="">All jobs</option>
    <option value="remote">Remote</option>
    <option value="senior">Senior</option>
    <option value="energy">Energy</option>
    {/* add more if you have other industries/tags */}
  </select>
</div>
      <SearchBar onSearch={(term) => search(term, 0, tag)} />

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
                position={page * 10 + idx + 1}
                initiallySaved={savedSet.has(job.objectID)}     // ★ NEW
                onToggle={handleToggle}                         // ★ NEW
                onOpen={() => setSelectedJob(job)} 
              />
            ))}
          </div>

          {result.nbPages > 1 && (
            <Pagination
              page={page}
              nbPages={result.nbPages}
              onPage={(p) => search(query, p, tag)}
            />
          )}
        </>
      )}
      <hr className="my-6" />

<h2 className="text-xl font-semibold">📄 Résumé matcher</h2>

<ResumeForm
  onResult={(r) => {
    setResumeSkills(r.skills);
    setResumeHits(r.hits);
  }}
/>

{resumeHits.length > 0 && (
  <>
    <p className="mt-4 text-sm text-gray-500">
      Extracted skills:&nbsp;
      {resumeSkills.join(', ')}
    </p>

    <div className="grid gap-4 mt-2">
      {resumeHits.map((hit, i) => (
        <JobCard
          key={hit.objectID}
          job={hit}
          queryID={hit.__queryID ?? ''}
          position={i + 1}
        />
      ))}
    </div>
  </>
)}
<JobModal
  job={selectedJob}
  saved={selectedJob ? savedSet.has(selectedJob.objectID) : false}
  onClose={() => setSelectedJob(null)}
  onToggleSave={toggleFavorite}
/>
    </main>
  );
}
