/* eslint-disable react-hooks/exhaustive-deps */
'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SavedPage;
const react_1 = require("react");
const axios_1 = __importDefault(require("axios"));
const JobCard_1 = __importDefault(require("../components/JobCard"));
const JobModal_1 = __importDefault(require("../components/JobModal"));
const insightsClient_1 = require("../insightsClient");
function SavedPage() {
    const [jobs, setJobs] = (0, react_1.useState)([]);
    const [savedSet, setSavedSet] = (0, react_1.useState)(new Set());
    const [selected, setSelected] = (0, react_1.useState)(null);
    /* fetch saved IDs + details */
    (0, react_1.useEffect)(() => {
        (async () => {
            try {
                const userToken = (0, insightsClient_1.getUserToken)();
                const { data } = await axios_1.default.get('/api/favorites/details', { params: { userToken } });
                setJobs(data);
                setSavedSet(new Set(data.map((j) => j.objectID)));
            }
            catch (err) {
                console.error(err);
            }
        })();
    }, []);
    /* unsave helper */
    async function toggleSave(job, save) {
        try {
            await axios_1.default.post('/api/favorites', {
                objectID: job.objectID,
                userToken: (0, insightsClient_1.getUserToken)(),
                save,
            });
            setSavedSet((prev) => {
                const next = new Set(prev);
                save ? next.add(job.objectID) : next.delete(job.objectID);
                return next;
            });
            setJobs((prev) => prev.filter((j) => j.objectID !== job.objectID));
        }
        catch (err) {
            console.error(err);
        }
    }
    return (<main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Saved Jobs</h1>

      {jobs.length === 0 && (<p className="text-sm text-gray-400">No jobs saved yet.</p>)}

      <div className="grid gap-4">
        {jobs.map((job, idx) => (<JobCard_1.default key={job.objectID} job={{ ...job, __position: idx + 1 }} queryID="" // no search context
         initiallySaved={savedSet.has(job.objectID)} onToggle={(id, save) => toggleSave(job, save)} onOpen={() => setSelected(job)}/>))}
      </div>

      <JobModal_1.default job={selected} saved={selected ? savedSet.has(selected.objectID) : false} onClose={() => setSelected(null)} onToggleSave={toggleSave}/>
    </main>);
}
