'use client';
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = JobModal;
const react_1 = require("react");
const axios_1 = __importDefault(require("axios"));
const JobCard_1 = __importDefault(require("./JobCard"));
const react_2 = require("@headlessui/react");
const insightsClient_1 = __importStar(require("../insightsClient"));
function JobModal({ job, onClose, saved, onToggleSave }) {
    var _a, _b;
    const [similar, setSimilar] = (0, react_1.useState)([]);
    // fire Algolia “view” event
    (0, react_1.useEffect)(() => {
        if (!job)
            return;
        (0, insightsClient_1.default)('viewedObjectIDs', {
            index: 'jobs',
            eventName: 'Job viewed',
            objectIDs: [job.objectID],
            userToken: (0, insightsClient_1.getUserToken)(),
        });
    }, [job]);
    // ★ NEW: fetch “similar” jobs whenever this modal opens
    (0, react_1.useEffect)(() => {
        if (!job) {
            setSimilar([]);
            return;
        }
        (async () => {
            try {
                const { data } = await axios_1.default.get(`/api/recommend/job/${job.objectID}`);
                setSimilar(data);
            }
            catch (err) {
                console.error('Failed to load similar jobs', err);
            }
        })();
    }, [job]);
    if (!job)
        return null;
    return (<react_2.Transition.Root show={!!job} as={react_1.Fragment}>
      <react_2.Dialog as="div" className="relative z-50" onClose={onClose}>
        <react_2.Transition.Child as={react_1.Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm"/>
        </react_2.Transition.Child>

        <div className="fixed inset-0 flex items-start justify-center p-4 sm:p-8 overflow-y-auto">
          <react_2.Transition.Child as={react_1.Fragment} enter="ease-out duration-200" enterFrom="opacity-0 translate-y-6 sm:translate-y-0 sm:scale-95" enterTo="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 translate-y-0 sm:scale-100" leaveTo="opacity-0 translate-y-6 sm:translate-y-0 sm:scale-95">
        <react_2.Dialog.Panel className="w-full sm:max-w-lg lg:max-w-2xl transform rounded-2xl bg-zinc-900 text-zinc-100 p-6 shadow-2xl ring-1 ring-zinc-700/50 transition-all">
              {/* header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <react_2.Dialog.Title className="text-xl font-semibold">
                    {job.title}
                  </react_2.Dialog.Title>
                  <p className="text-sm text-gray-600">
                    {job.company} – {job.location}
                  </p>
                </div>

                {/* Save / unsave */}
                <button onClick={() => onToggleSave(job, !saved)} className="text-red-500 hover:text-red-600" aria-label={saved ? 'Unsave job' : 'Save job'}>
                  {saved ? '♥' : '♡'}
                </button>
              </div>

              <hr className="my-4"/>

              {/* description */}
              <div className="prose max-w-none text-sm leading-relaxed">
                {(_a = job.description) === null || _a === void 0 ? void 0 : _a.split('\n').map((p) => (<p key={p.slice(0, 20)}>{p}</p>))}
              </div>

              {/* skills */}
              {((_b = job.skills) === null || _b === void 0 ? void 0 : _b.length) && (<>
                  <h3 className="mt-6 mb-2 font-medium">Key skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((s) => (<span key={s} className="rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-600">
                        {s}
                      </span>))}
                  </div>
                </>)}

              {/* apply */}
              {job.applyUrl && (<a href={job.applyUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                  Apply on company site →
                </a>)}
              
              {/* ★ NEW: “You might also like” */}
              {similar.length > 0 && (<div className="mt-6">
                  <h3 className="text-lg font-medium">You might also like</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    {similar.map((s) => (<JobCard_1.default key={s.objectID} job={s} queryID="" // not from a search
             position={0} // no ranking position here
             initiallySaved={false} onToggle={() => { }} onOpen={() => { }}/>))}
                  </div>
                </div>)}
            </react_2.Dialog.Panel>
          </react_2.Transition.Child>
        </div>
      </react_2.Dialog>
    </react_2.Transition.Root>);
}
