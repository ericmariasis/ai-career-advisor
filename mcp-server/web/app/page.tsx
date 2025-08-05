
'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
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
import FacetList, { type FacetBucket } from './components/FacetList';
import FilterChips from './components/FilterChips';
import SalarySlider from './components/filters/SalarySlider';
import SuggestionsCarousel from './components/SuggestionsCarousel';

// Simplified sort controls inline to avoid Suspense boundary issues

import { useFavorites } from './contexts/FavoritesContext';
import { useResume } from './contexts/ResumeContext';

// Simple debounce utility for salary slider
const useDebounce = <T extends unknown[]>(
  callback: (...args: T) => void, 
  delay: number
) => {
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  
  return (...args: T) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => callback(...args), delay);
    setDebounceTimer(timer);
  };
};

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
    const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [selectedSeniority, setSelectedSeniority] = useState<string | null>(null);
    const [selectedIndustryAI, setSelectedIndustryAI] = useState<string | null>(null);
    // ★ NEW: control expand/collapse of long facet lists
    const [showAllLoc, setShowAllLoc] = useState(false);
    const [showAllInd, setShowAllInd] = useState(false);
    // ★ NEW: search within filters
    const [locationSearch, setLocationSearch] = useState('');
    const [industrySearch, setIndustrySearch] = useState('');
  const [query, setQuery]     = useState('');
  const [page,  setPage]      = useState(0);
  const [result, setResult]   = useState<AlgoliaResponse | null>(null);
  
  // State for sorting preference
  const [sortByFit, setSortByFit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resumeSkills, setResumeSkills] = useState<string[]>([]);
  const [resumeHits,   setResumeHits]   = useState<Job[]>([]);
  const [selectedJob,  setSelectedJob]  = useState<Job | null>(null);
  
  // ★ NEW: Similar jobs fallback state
  const [similarHits, setSimilarHits] = useState<Job[]>([]);
  const [showSimilar, setShowSimilar] = useState(false);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  // ★ NEW: salary range state
  const [salaryRange, setSalaryRange] = useState<[number, number]>([0, 500000]);
  // ★ NEW: scroll detection for floating navigation
  const [showScrollNav, setShowScrollNav] = useState(false);
  
  const { savedSet, toggleFavorite } = useFavorites();
  const { skills: contextResumeSkills } = useResume();

  // Ref to track current search and prevent duplicates
  const currentSearchRef = useRef<string>('');

  // Debounced salary range handler to prevent excessive API calls
  const debouncedSalaryChange = useDebounce((range: [number, number]) => {
    setSalaryRange(range);
  }, 300);

  // ★ NEW: Scroll detection for floating navigation
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 400; // Show after scrolling 400px
      setShowScrollNav(scrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  /* ---------------- search helper ---------------- */
    const search = useCallback(async (
        q: string,
        page = 0
      ) => {
    // Create unique search key to prevent duplicates
    const searchKey = `${q}-${page}`;
    if (currentSearchRef.current === searchKey) {
      console.log('⚠️ Duplicate search prevented:', searchKey);
      return;
    }
    currentSearchRef.current = searchKey;
    
    setLoading(true);
    
    // Reset similar state immediately when starting new search
    setShowSimilar(false);
    setSimilarHits([]);
    setLoadingSimilar(false);
    
    try {
            // build an array of facetFilters for location, industry, company, skills, and your existing tag
      const ff: string[] = [];
      selectedLocations.forEach(loc => ff.push(`location:${loc}`));
      selectedIndustries.forEach(ind => ff.push(`industry:${ind}`));
      selectedCompanies.forEach(comp => ff.push(`company:${comp}`));
      selectedSkills.forEach(skill => ff.push(`skills:${skill}`));


      
      const { data } = await axios.get<AlgoliaResponse>('/api/search', {
                params: {
                  q,
                  page,
                  hitsPerPage: 10,
                  facetFilters: JSON.stringify(ff),
                  salaryMin: salaryRange[0] > 0 ? salaryRange[0].toString() : '',
                  salaryMax: salaryRange[1] < 500000 ? salaryRange[1].toString() : '',
                  seniority_ai: selectedSeniority,
                  industry_ai: selectedIndustryAI,
                },
              });
      setResult(data);
      setQuery(q);
      setPage(page);
      
      // ★ NEW: Fallback to similar jobs if no results and query exists
      if (data.hits.length === 0 && q?.trim()) {
        setLoadingSimilar(true);
        setShowSimilar(true);
        console.log('⏳ STARTING skeleton loading state for:', q);
        try {
          console.log('🔍 No results found, fetching similar jobs for:', q);
          
          // Use the real semantic search endpoint
          const fallbackResponse = await axios.get<Job[]>('/api/recommend/suggestions', {
            params: {
              text: q,
            },
          });
          
          const suggestions = fallbackResponse.data || [];
          console.log('✅ SKELETON LOADING COMPLETE, got', suggestions.length, 'suggestions');
          setSimilarHits(suggestions);
        } catch (err) {
          console.error('Failed to fetch similar jobs:', err);
          setSimilarHits([]);
          setShowSimilar(false);
        } finally {
          console.log('🎯 ENDING skeleton loading state');
          setLoadingSimilar(false);
        }
      } else {
        setShowSimilar(false);
        setSimilarHits([]);
        setLoadingSimilar(false);
      }
    } finally {
      setLoading(false);
      // Clear the search key after a delay to allow the same search later
      setTimeout(() => {
        currentSearchRef.current = '';
      }, 100);
    }
  }, [selectedLocations, selectedIndustries, selectedCompanies, selectedSkills, selectedSeniority, selectedIndustryAI, salaryRange]);


  
      // ★ UNIFIED: single useEffect for all search triggers
      useEffect(() => {
        search(query, 0);
      }, [search, query]);


      function clearSearch() {
        setQuery('');
        setPage(0);
        setSelectedLocations(new Set());
        setSelectedIndustries(new Set());
        setSelectedCompanies([]);
        setSelectedSkills([]);
        setSelectedSeniority(null);
        setSelectedIndustryAI(null);
        setSalaryRange([0, 500000]); // Reset salary range
        search('', 0);
      }

      // ★ NEW: Handle facet filter changes
      const handleFacetChange = (facet: string, selected: string[]) => {
        if (facet === 'company') {
          setSelectedCompanies(selected);
        } else if (facet === 'skills') {
          setSelectedSkills(selected);
        }
      };

      // ★ NEW: Convert facet dictionaries to FacetBucket arrays
      const getCompanyBuckets = (): FacetBucket[] => {
        return Object.entries(result?.facets?.company ?? {})
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count);
      };

      const getSkillsBuckets = (): FacetBucket[] => {
        return Object.entries(result?.facets?.skills ?? {})
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count);
      };

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Live Counter */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-white border-b px-6 py-4 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">AI Career Advisor</h1>
        <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm text-gray-800">
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
            <h4 className="font-semibold mb-2 text-gray-900">Location</h4>
            
            {/* Search box for locations */}
            <input
              type="text"
              placeholder="Search locations..."
              className="w-full text-xs px-2 py-1 border border-gray-300 rounded mb-2 text-gray-900"
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
            />
            
            <div className="max-h-48 overflow-y-auto">
              {Object.entries(result.facets.location ?? {})
                .sort((a, b) => b[1] - a[1])
                .filter(([loc]) => {
                  // Format location display for filtering
                  const displayLocation = Array.isArray(loc) 
                    ? loc.join(', ') 
                    : typeof loc === 'string' && loc.startsWith('[') && loc.endsWith(']')
                      ? loc.slice(1, -1).split(',').map(s => s.trim().replace(/"/g, '')).join(', ')
                      : loc;
                  
                  return displayLocation.toLowerCase().includes(locationSearch.toLowerCase());
                })
                .slice(0, showAllLoc ? undefined : 10)
                .map(([loc, count]) => {
                  // Format location display - handle if it's an array or string
                  const displayLocation = Array.isArray(loc) 
                    ? loc.join(', ') 
                    : typeof loc === 'string' && loc.startsWith('[') && loc.endsWith(']')
                      ? loc.slice(1, -1).split(',').map(s => s.trim().replace(/"/g, '')).join(', ')
                      : loc;
                  
                  return (
                    <label key={loc} className="block text-sm py-1 text-gray-800">
                      <input
                        type="checkbox"
                        className="mr-2"
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
                      {displayLocation} <span className="text-gray-700">({count})</span>
                    </label>
                  );
                })}
            </div>
            
            {/* Show more button - only if not searching */}
            {!locationSearch && Object.keys(result.facets.location ?? {}).length > 10 && (
              <button
                className="mt-2 text-xs text-indigo-500 hover:text-indigo-700 underline"
                onClick={() => setShowAllLoc(x => !x)}
              >
                {showAllLoc ? 'Show less…' : 'Show more…'}
              </button>
            )}
          </div>

          {/* Industry facet */}
          <div className="w-1/2">
            <h4 className="font-semibold mb-2 text-gray-900">Industry</h4>
            
            {/* Search box for industries */}
            <input
              type="text"
              placeholder="Search industries..."
              className="w-full text-xs px-2 py-1 border border-gray-300 rounded mb-2 text-gray-900"
              value={industrySearch}
              onChange={(e) => setIndustrySearch(e.target.value)}
            />
            
            <div className="max-h-48 overflow-y-auto">
              {Object.entries(result.facets.industry ?? {})
                .sort((a, b) => b[1] - a[1])
                .filter(([ind]) => {
                  return ind.toLowerCase().includes(industrySearch.toLowerCase());
                })
                .slice(0, showAllInd ? undefined : 10)
                .map(([ind, count]) => (
                  <label key={ind} className="block text-sm py-1 text-gray-800">
                    <input
                      type="checkbox"
                      className="mr-2"
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
                    {ind} <span className="text-gray-700">({count})</span>
                  </label>
                ))}
            </div>
            
            {/* Show more button - only if not searching */}
            {!industrySearch && Object.keys(result.facets.industry ?? {}).length > 10 && (
              <button
                className="mt-2 text-xs text-indigo-500 hover:text-indigo-700 underline"
                onClick={() => setShowAllInd(x => !x)}
              >
                {showAllInd ? 'Show less…' : 'Show more…'}
              </button>
            )}
          </div>

          {/* ★ NEW: Company facets */}
          <FacetList
            title="Company"
            facet="company"
            buckets={getCompanyBuckets()}
            selected={selectedCompanies}
            onChange={handleFacetChange}
            searchPlaceholder="Search companies..."
          />

          {/* ★ NEW: Skills facets */}
          <FacetList
            title="Skills"
            facet="skills"
            buckets={getSkillsBuckets()}
            selected={selectedSkills}
            onChange={handleFacetChange}
            searchPlaceholder="Search skills..."
          />

          {/* ★ NEW: AI Filter Chips */}
          <FilterChips
            title="Seniority"
            values={['Intern', 'Junior', 'Mid', 'Senior', 'Lead']}
            selected={selectedSeniority}
            onPick={setSelectedSeniority}
          />

          <FilterChips
            title="Industry (AI)"
            values={['FinTech', 'HealthTech', 'EdTech', 'SaaS', 'E-commerce', 'Gaming', 'AI/ML', 'Blockchain', 'IoT', 'Cybersecurity']}
            selected={selectedIndustryAI}
            onPick={setSelectedIndustryAI}
          />

        </div>
      )}
       <header className="flex items-baseline gap-6">
           <h1 className="text-2xl font-bold text-gray-900">AI Job Explorer</h1>

   {/* Saved-jobs link */}
   <a
     href="/saved"
     className="text-sm text-indigo-400 hover:text-indigo-300 underline"
   >
     Saved&nbsp;Jobs
   </a>
 </header>
       {/* ★ NEW: Salary Range Slider */}
      <div className="mb-4">
        <SalarySlider
          min={0}
          max={500000}
          value={salaryRange}
          onChange={debouncedSalaryChange}
        />
      </div>


      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <SearchBar
            onSearch={(term) => search(term, 0)}
            onSelectHit={(hit) => {
                  // hit already contains all attributes you need
                  setSelectedJob(hit);
                }}
                onClear={clearSearch}
          />
          {/* Keyboard shortcut hint */}
                      <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border px-1.5 py-0.5 text-xs text-gray-600 bg-gray-50 hidden md:block">
            {typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘K' : 'Ctrl+K'}
          </kbd>
        </div>
        <Sparkline />
      </div>

      {/* Quick Access CTA to Resume Matcher */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-emerald-900">📄 Got a resume?</h3>
            <p className="text-sm text-emerald-700 mt-1">
              Upload it to find jobs that match your skills automatically
            </p>
          </div>
          <button
            onClick={() => {
              document.getElementById('resume-matcher')?.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
              });
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 shrink-0"
          >
            Try Resume Matcher →
          </button>
        </div>
      </div>

      {loading && <p>Loading…</p>}

      {result && (
        <>
                  <p className="text-sm text-gray-700">
          {result.nbHits.toLocaleString()} jobs found
        </p>
          
          {/* Resume skill indicator or empty state */}
          {contextResumeSkills.length > 0 ? (
            <p className="text-sm text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 inline-block">
              📄 Matching against <b>{contextResumeSkills.length}</b> résumé skills
            </p>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4">
              <p className="text-sm text-blue-700">
                📄 <strong>Upload your résumé</strong> to see personalized matches with highlighted skills →{' '}
                <button
                  onClick={() => {
                    document.getElementById('resume-matcher')?.scrollIntoView({ 
                      behavior: 'smooth',
                      block: 'start'
                    });
                  }}
                  className="text-blue-600 hover:text-blue-800 underline font-medium"
                >
                  Try Resume Matcher
                </button>
              </p>
            </div>
          )}
          
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
                <div className="text-gray-700">Searching...</div>
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
                search(query, p)
              }
            />
          )}
        </>
      )}
      
      {/* ★ NEW: Similar jobs fallback carousel */}
      {showSimilar && (
        <SuggestionsCarousel
          hits={similarHits}
          loading={loadingSimilar}
          onJobSelect={(job) => setSelectedJob(job)}
        />
      )}
      
      <hr className="my-6" />

<h2 id="resume-matcher" className="text-xl font-semibold text-gray-900">📄 Résumé matcher</h2>

<ResumeForm
  onResult={(r) => {
    setResumeSkills(r.skills);
    setResumeHits(r.hits);
  }}
/>

{resumeHits.length > 0 && (
  <>
              <p className="mt-4 text-sm text-gray-700">
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

{/* Floating Navigation Cluster - Back to Top & Search */}
{showScrollNav && (
  <div className="fixed bottom-8 left-8 flex flex-col gap-3 z-40">
    {/* Back to Top Button */}
    <button
      onClick={() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 group"
      title="Back to Top"
      aria-label="Scroll to top of page"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 11l5-5m0 0l5 5m-5-5v12"
        />
      </svg>
      
      {/* Tooltip */}
      <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
        ⬆️ Back to Top
      </span>
    </button>

    {/* Back to Search Button */}
    <button
      onClick={() => {
        document.querySelector('input[type="search"]')?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'center'
        });
        // Optional: Focus the search input after scrolling
        setTimeout(() => {
          const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
          searchInput?.focus();
        }, 500);
      }}
      className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 group"
      title="Back to Search"
      aria-label="Go back to search bar"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      
      {/* Tooltip */}
      <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
        🔍 Back to Search
      </span>
    </button>
  </div>
)}

{/* Floating Action Button - Jump to Resume Matcher */}
<button
  onClick={() => {
    document.getElementById('resume-matcher')?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  }}
  className="fixed bottom-8 right-8 bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-40 group"
  title="Jump to Resume Matcher"
  aria-label="Jump to Resume Matcher section"
>
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
  
  {/* Tooltip */}
  <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
    📄 Resume Matcher
  </span>
</button>
      </main>
    </div>
  );
}
