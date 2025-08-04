
'use client';
import { useState, useEffect } from 'react';
// Removed useSearchParams to avoid Suspense boundary issue

// Skip prerendering due to algoliasearch client issues
export const dynamic = 'force-dynamic';
import type { Job } from './types/job';
import JobModal from './components/JobModal'; 
import axios from 'axios';
import SearchBar  from './components/SearchBar';
import JobCard    from './components/JobCard';
import Pagination from './components/Pagination';
import ResumeForm from './components/ResumeForm';
import { LiveFavoritesCounter } from './components/LiveFavoritesCounter';
import { Sparkline } from './components/Sparkline';
import EmptyState from './components/EmptyState';

// Simplified sort controls inline to avoid Suspense boundary issues

import { useFavorites } from './contexts/FavoritesContext';

type AlgoliaResponse = {
  hits: Job[];
  nbHits: number;
  page: number;
  nbPages: number;
  queryID: string;
  facets?: { [facetName: string]: Record<string, number> };
};

export default function Home() {
  const [selectedLocations,  setSelectedLocations]  = useState<Set<string>>(new Set());
    const [selectedIndustries, setSelectedIndustries] = useState<Set<string>>(new Set());
    // ★ NEW: control expand/collapse of long facet lists
    const [showAllLoc, setShowAllLoc] = useState(false);
    const [showAllInd, setShowAllInd] = useState(false);
  const [query, setQuery]     = useState('');
  const [page,  setPage]      = useState(0);
  const [result, setResult]   = useState<AlgoliaResponse | null>(null);
  
  // State for sorting preference
  const [sortByFit, setSortByFit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resumeSkills, setResumeSkills] = useState<string[]>([]);
  const [resumeHits,   setResumeHits]   = useState<Job[]>([]);
  const [selectedJob,  setSelectedJob]  = useState<Job | null>(null);
    const [tag, setTag] = useState('');
  // ★ NEW: salary range state
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  
  const { savedSet, toggleFavorite } = useFavorites();


  /* ---------------- search helper ---------------- */
    async function search(
        q: string,
        page = 0,
        tag = '',
        salaryMin = '',
        salaryMax = ''
      ) {
    setLoading(true);
    try {
            // build an array of facetFilters for location, industry, and your existing tag
      const ff: string[] = [];
      selectedLocations.forEach(loc => ff.push(`location:${loc}`));
      selectedIndustries.forEach(ind => ff.push(`industry:${ind}`));
      if (tag) ff.push(`tags:${tag}`);


      
      const { data } = await axios.get<AlgoliaResponse>('/api/search', {
                params: {
                  q,
                  page,
                  tag,
                  hitsPerPage: 10,
                  facetFilters: JSON.stringify(ff),
                  salaryMin,
                  salaryMax,
                },
              });
      setResult(data);
      setQuery(q);
      setPage(page);
    } finally {
      setLoading(false);
    }
  }


  
      // ★ UNIFIED: single useEffect for all search triggers
      useEffect(() => {
        search(query, 0, tag, salaryMin, salaryMax);
      }, [selectedLocations, selectedIndustries, query, tag, salaryMin, salaryMax]);


      function clearSearch() {
        setQuery('');
        setTag('');
        setPage(0);
        // salaryMin / salaryMax stay as-is so the user's filters persist
        search('', 0, '', salaryMin, salaryMax);
      }

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Live Counter */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-white border-b px-6 py-4 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">AI Career Advisor</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Live favorites:</span>
            <LiveFavoritesCounter initialCount={0} />
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto p-6 space-y-6">
      {/* ★ NEW: Facet panels */}
      {result?.facets && (
        <div className="flex gap-8 mb-4">

          {/* Location facet */}
          <div className="w-1/2">
            <h4 className="font-semibold">Location</h4>
            {Object.entries(result.facets.location ?? {})
              .sort((a, b) => b[1] - a[1])
              .slice(0, showAllLoc ? undefined : 10)
              .map(([loc, count]) => {
                // Format location display - handle if it's an array or string
                const displayLocation = Array.isArray(loc) 
                  ? loc.join(', ') 
                  : typeof loc === 'string' && loc.startsWith('[') && loc.endsWith(']')
                    ? loc.slice(1, -1).split(',').map(s => s.trim().replace(/"/g, '')).join(', ')
                    : loc;
                
                return (
                  <label key={loc} className="block text-sm">
                    <input
                      type="checkbox"
                      className="mr-1"
                      checked={selectedLocations.has(displayLocation)}
                      onChange={e => {
                        const next = new Set(selectedLocations);
                        if (e.target.checked) {
                          next.add(displayLocation);
                        } else {
                          next.delete(displayLocation);
                        }
                        setSelectedLocations(next);
                      }}
                    />
                    {displayLocation} <span className="text-gray-500">({count})</span>
                  </label>
                );
              })}
            {Object.keys(result.facets.location ?? {}).length > 10 && (
              <button
                className="mt-1 text-xs text-indigo-400 underline"
                onClick={() => setShowAllLoc(x => !x)}
              >
                {showAllLoc ? 'Show less…' : 'Show more…'}
              </button>
            )}
          </div>

          {/* Industry facet */}
          <div className="w-1/2">
            <h4 className="font-semibold">Industry</h4>
            {Object.entries(result.facets.industry ?? {})
              .sort((a, b) => b[1] - a[1])
              .slice(0, showAllInd ? undefined : 10)
              .map(([ind, count]) => (
                <label key={ind} className="block text-sm">
 <input
   type="checkbox"
   className="mr-1"
   checked={selectedIndustries.has(ind)}
   onChange={e => {
     const next = new Set(selectedIndustries);
     if (e.target.checked) {
       next.add(ind);
     } else {
       next.delete(ind);
     }
     setSelectedIndustries(next);
   }}
 />
               {ind} <span className="text-gray-500">({count})</span>
             </label>
              ))}
            {Object.keys(result.facets.industry ?? {}).length > 10 && (
              <button
                className="mt-1 text-xs text-indigo-400 underline"
                onClick={() => setShowAllInd(x => !x)}
              >
                {showAllInd ? 'Show less…' : 'Show more…'}
              </button>
            )}
          </div>

        </div>
      )}
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
       {/* ★ NEW: salary-min / salary-max inputs */}
      <div className="flex items-center gap-4 mb-4">
        <label className="text-sm">Salary Min:</label>
        <input
          type="number"
          value={salaryMin}
          onChange={e => setSalaryMin(e.target.value)}
          placeholder="0"
          className="w-20 rounded bg-zinc-800 px-2 py-1 text-sm"
        />
        <label className="text-sm">Max:</label>
        <input
          type="number"
          value={salaryMax}
          onChange={e => setSalaryMax(e.target.value)}
          placeholder="∞"
          className="w-20 rounded bg-zinc-800 px-2 py-1 text-sm"
        />
      </div>

      <div className="flex items-center gap-2">
  <label className="text-sm text-gray-400">Filter:</label>
  <select
    value={tag}
            onChange={(e) => {
                const val = e.target.value;
                setTag(val);
                search(query, 0, val, salaryMin, salaryMax);
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
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <SearchBar
            onSearch={(term) => search(term, 0, tag, salaryMin, salaryMax)}
            onSelectHit={(hit) => {
                  // hit already contains all attributes you need
                  setSelectedJob(hit);
                }}
                onClear={clearSearch}
          />
          {/* Keyboard shortcut hint */}
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border px-1.5 py-0.5 text-xs text-gray-400 bg-gray-50 hidden md:block">
            {typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘K' : 'Ctrl+K'}
          </kbd>
        </div>
        <Sparkline />
      </div>



      {loading && <p>Loading…</p>}

      {result && (
        <>
          <p className="text-sm text-gray-500">
            {result.nbHits.toLocaleString()} jobs found
          </p>
          
          {/* Sort controls */}
          <div className="mb-4 flex items-center gap-2">
            <button
              onClick={() => setSortByFit(!sortByFit)}
              className={`${
                sortByFit ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
              } relative inline-flex h-8 px-3 items-center rounded-full transition text-sm`}
            >
              {sortByFit ? '✓ ' : ''}Best fit first
            </button>
          </div>

          {(() => {
            // Apply sorting if requested
            const jobsToShow = sortByFit
              ? [...result.hits].sort((a, b) => {
                  // Sort by fit score (highest first)
                  const aFit = a.fitScore ?? 0;
                  const bFit = b.fitScore ?? 0;
                  return bFit - aFit;
                })
              : result.hits;
            
            return jobsToShow.length === 0 && !loading ? (
              <EmptyState
                title="No matching roles"
                subtitle="Try changing keywords, location, or salary range to find more opportunities."
              />
            ) : loading && jobsToShow.length === 0 ? (
              <div className="flex justify-center py-8">
                <div className="text-gray-500">Searching...</div>
              </div>
            ) : (
              <div className="grid gap-4">
                {jobsToShow.map((job, idx) => (
                  <JobCard
                    key={job.objectID}
                    job={{ ...job, __position: page * 10 + idx + 1 }}
                    queryID={result.queryID}
                    onOpen={() => setSelectedJob(job)} 
                  />
                ))}
              </div>
            );
          })()}

                    {result.nbPages > 1 && (
            <Pagination
              page={page}
              nbPages={result.nbPages}
              onPage={(p) =>
                search(query, p, tag, salaryMin, salaryMax)
              }
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
      {resumeHits.map((hit) => (
        <JobCard
          key={hit.objectID}
          job={hit}
          queryID={hit.__queryID ?? ''}
          onOpen={() => setSelectedJob(hit)}
        />
      ))}
    </div>
  </>
)}
<JobModal
  job={selectedJob}
  saved={selectedJob ? savedSet.has(selectedJob.objectID) : false}
  onClose={() => setSelectedJob(null)}
  onToggleSave={(job, save) => toggleFavorite(job.objectID, save)}
/>
      </main>
    </div>
  );
}
