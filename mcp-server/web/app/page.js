/* eslint-disable react-hooks/exhaustive-deps */
'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Home;
const react_1 = require("react");
const JobModal_1 = __importDefault(require("./components/JobModal"));
const axios_1 = __importDefault(require("axios"));
const SearchBar_1 = __importDefault(require("./components/SearchBar"));
const JobCard_1 = __importDefault(require("./components/JobCard"));
const Pagination_1 = __importDefault(require("./components/Pagination"));
const ResumeForm_1 = __importDefault(require("./components/ResumeForm"));
const insightsClient_1 = require("./insightsClient");
function Home() {
    var _a, _b, _c, _d;
    const [selectedLocations, setSelectedLocations] = (0, react_1.useState)(new Set());
    const [selectedIndustries, setSelectedIndustries] = (0, react_1.useState)(new Set());
    // ★ NEW: control expand/collapse of long facet lists
    const [showAllLoc, setShowAllLoc] = (0, react_1.useState)(false);
    const [showAllInd, setShowAllInd] = (0, react_1.useState)(false);
    const [query, setQuery] = (0, react_1.useState)('');
    const [page, setPage] = (0, react_1.useState)(0);
    const [result, setResult] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [savedSet, setSaved] = (0, react_1.useState)(new Set());
    const [resumeSkills, setResumeSkills] = (0, react_1.useState)([]);
    const [resumeHits, setResumeHits] = (0, react_1.useState)([]);
    const [selectedJob, setSelectedJob] = (0, react_1.useState)(null);
    const [tag, setTag] = (0, react_1.useState)('');
    // ★ NEW: salary range state
    const [salaryMin, setSalaryMin] = (0, react_1.useState)('');
    const [salaryMax, setSalaryMax] = (0, react_1.useState)('');
    /* ---------------- search helper ---------------- */
    async function search(q, page = 0, tag = '', salaryMin = '', salaryMax = '') {
        setLoading(true);
        try {
            // build an array of facetFilters for location, industry, and your existing tag
            const ff = [];
            selectedLocations.forEach(loc => ff.push(`location:${loc}`));
            selectedIndustries.forEach(ind => ff.push(`industry:${ind}`));
            if (tag)
                ff.push(`tags:${tag}`);
            const { data } = await axios_1.default.get('/api/search', {
                params: {
                    q,
                    page,
                    tag,
                    hitsPerPage: 10,
                    facetFilters: ff,
                    salaryMin,
                    salaryMax,
                },
            });
            setResult(data);
            setQuery(q);
            setPage(page);
        }
        finally {
            setLoading(false);
        }
    }
    /* bubble up save / unsave from JobCard */
    function handleToggle(id, saved) {
        setSaved((prev) => {
            const next = new Set(prev);
            saved ? next.add(id) : next.delete(id);
            return next;
        });
    }
    async function toggleFavorite(job, save) {
        var _a, _b;
        try {
            await axios_1.default.post('/api/favorites', {
                objectID: job.objectID,
                // these two are optional when saving from a modal
                queryID: (_a = job.__queryID) !== null && _a !== void 0 ? _a : '',
                position: (_b = job.__position) !== null && _b !== void 0 ? _b : 0,
                userToken: (0, insightsClient_1.getUserToken)(),
                save,
            });
            handleToggle(job.objectID, save); // keep global state in sync
        }
        catch (err) {
            console.error('Could not toggle favourite', err);
        }
    }
    // whenever tag or salary range change, reset to page 0
    (0, react_1.useEffect)(() => {
        search('', 0, tag, salaryMin, salaryMax);
    }, [tag, salaryMin, salaryMax]);
    // ★ NEW: whenever the facet-sets change, re-run the search
    (0, react_1.useEffect)(() => {
        search(query, 0, tag, salaryMin, salaryMax);
    }, [selectedLocations, selectedIndustries]);
    (0, react_1.useEffect)(() => {
        const fetchSaved = async () => {
            try {
                const { data } = await axios_1.default.get('/api/favorites', {
                    params: { userToken: (0, insightsClient_1.getUserToken)() },
                });
                setSaved(new Set(data.ids));
            }
            catch (err) {
                console.error('Could not load favourites', err);
            }
        };
        fetchSaved();
    }, []);
    function clearSearch() {
        setQuery('');
        setTag('');
        setPage(0);
        // salaryMin / salaryMax stay as-is so the user’s filters persist
        search('', 0, '', salaryMin, salaryMax);
    }
    return (<main className="max-w-4xl mx-auto p-6 space-y-6">
      {/* ★ NEW: Facet panels */}
      {(result === null || result === void 0 ? void 0 : result.facets) && (<div className="flex gap-8 mb-4">

          {/* Location facet */}
          <div className="w-1/2">
            <h4 className="font-semibold">Location</h4>
            {Object.entries((_a = result.facets.location) !== null && _a !== void 0 ? _a : {})
                .sort((a, b) => b[1] - a[1])
                .slice(0, showAllLoc ? undefined : 10)
                .map(([loc, count]) => (<label key={loc} className="block text-sm">
               <input type="checkbox" className="mr-1" checked={selectedLocations.has(loc)} onChange={e => {
                    const next = new Set(selectedLocations);
                    e.target.checked ? next.add(loc) : next.delete(loc);
                    setSelectedLocations(next);
                    // …
                }}/>
               {loc} <span className="text-gray-500">({count})</span>
             </label>))}
            {Object.keys((_b = result.facets.location) !== null && _b !== void 0 ? _b : {}).length > 10 && (<button className="mt-1 text-xs text-indigo-400 underline" onClick={() => setShowAllLoc(x => !x)}>
                {showAllLoc ? 'Show less…' : 'Show more…'}
              </button>)}
          </div>

          {/* Industry facet */}
          <div className="w-1/2">
            <h4 className="font-semibold">Industry</h4>
            {Object.entries((_c = result.facets.industry) !== null && _c !== void 0 ? _c : {})
                .sort((a, b) => b[1] - a[1])
                .slice(0, showAllInd ? undefined : 10)
                .map(([ind, count]) => (<label key={ind} className="block text-sm">
 <input type="checkbox" className="mr-1" checked={selectedIndustries.has(ind)} onChange={e => {
                    const next = new Set(selectedIndustries);
                    e.target.checked ? next.add(ind) : next.delete(ind);
                    setSelectedIndustries(next);
                }}/>
               {ind} <span className="text-gray-500">({count})</span>
             </label>))}
            {Object.keys((_d = result.facets.industry) !== null && _d !== void 0 ? _d : {}).length > 10 && (<button className="mt-1 text-xs text-indigo-400 underline" onClick={() => setShowAllInd(x => !x)}>
                {showAllInd ? 'Show less…' : 'Show more…'}
              </button>)}
          </div>

        </div>)}
       <header className="flex items-baseline gap-6">
   <h1 className="text-2xl font-bold">AI Job Explorer</h1>

   {/* Saved-jobs link */}
   <a href="/saved" className="text-sm text-indigo-400 hover:text-indigo-300 underline">
     Saved&nbsp;Jobs
   </a>
 </header>
       {/* ★ NEW: salary-min / salary-max inputs */}
      <div className="flex items-center gap-4 mb-4">
        <label className="text-sm">Salary Min:</label>
        <input type="number" value={salaryMin} onChange={e => setSalaryMin(e.target.value)} placeholder="0" className="w-20 rounded bg-zinc-800 px-2 py-1 text-sm"/>
        <label className="text-sm">Max:</label>
        <input type="number" value={salaryMax} onChange={e => setSalaryMax(e.target.value)} placeholder="∞" className="w-20 rounded bg-zinc-800 px-2 py-1 text-sm"/>
      </div>

      <div className="flex items-center gap-2">
  <label className="text-sm text-gray-400">Filter:</label>
  <select value={tag} onChange={(e) => {
            const val = e.target.value;
            setTag(val);
            search(query, 0, val, salaryMin, salaryMax);
        }} className="rounded bg-zinc-800 px-2 py-1 text-sm">
    <option value="">All jobs</option>
    <option value="remote">Remote</option>
    <option value="senior">Senior</option>
    <option value="energy">Energy</option>
    {/* add more if you have other industries/tags */}
  </select>
    </div>
      <SearchBar_1.default onSearch={(term) => search(term, 0, tag, salaryMin, salaryMax)} onSelectHit={(hit) => {
            // hit already contains all attributes you need
            setSelectedJob(hit);
            // ensure it's marked as saved or not:
            handleToggle(hit.objectID, savedSet.has(hit.objectID));
        }} onClear={clearSearch}/>

      {loading && <p>Loading…</p>}

      {result && (<>
          <p className="text-sm text-gray-500">
            {result.nbHits.toLocaleString()} jobs found
          </p>

          <div className="grid gap-4">
            {result.hits.map((job, idx) => (<JobCard_1.default key={job.objectID} job={{ ...job, __position: page * 10 + idx + 1 }} queryID={result.queryID} position={page * 10 + idx + 1} initiallySaved={savedSet.has(job.objectID)} // ★ NEW
             onToggle={handleToggle} // ★ NEW
             onOpen={() => setSelectedJob(job)}/>))}
          </div>

                    {result.nbPages > 1 && (<Pagination_1.default page={page} nbPages={result.nbPages} onPage={(p) => search(query, p, tag, salaryMin, salaryMax)}/>)}
        </>)}
      <hr className="my-6"/>

    <h2 className="text-xl font-semibold">📄 Résumé matcher</h2>

    <ResumeForm_1.default onResult={(r) => {
            setResumeSkills(r.skills);
            setResumeHits(r.hits);
        }}/>

        {resumeHits.length > 0 && (<>
    <p className="mt-4 text-sm text-gray-500">
      Extracted skills:&nbsp;
      {resumeSkills.join(', ')}
    </p>

    <div className="grid gap-4 mt-2">
      {resumeHits.map((hit, i) => {
                var _a;
                return (<JobCard_1.default key={hit.objectID} job={hit} queryID={(_a = hit.__queryID) !== null && _a !== void 0 ? _a : ''} position={i + 1}/>);
            })}
    </div>
  </>)}
    <JobModal_1.default job={selectedJob} saved={selectedJob ? savedSet.has(selectedJob.objectID) : false} onClose={() => setSelectedJob(null)} onToggleSave={toggleFavorite}/>
    </main>);
}
