/* eslint-disable react/require-default-props */
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
exports.default = JobCard;
const react_1 = require("react");
const axios_1 = __importDefault(require("axios"));
const insightsClient_1 = __importStar(require("../insightsClient")); // ★ CHG
const solid_1 = require("@heroicons/react/24/solid");
const outline_1 = require("@heroicons/react/24/outline");
function JobCard({ job, queryID, initiallySaved = false, onToggle, onOpen, }) {
    var _a;
    const [saved, setSaved] = (0, react_1.useState)(initiallySaved);
    const userToken = (0, insightsClient_1.getUserToken)();
    /* ---------- handle “Save” / “Unsave” ---------- */
    async function toggleSave(e) {
        e.stopPropagation(); // don’t trigger card click
        const next = !saved;
        try {
            await axios_1.default.post('/api/favorites', {
                objectID: job.objectID,
                ...(queryID ? { queryID } : {}),
                ...(job.__position
                    ? { position: job.__position }
                    : {}),
                userToken,
                save: next,
            });
            setSaved(next);
            onToggle === null || onToggle === void 0 ? void 0 : onToggle(job.objectID, next);
        }
        catch (err) {
            console.error(err);
            alert('Could not save job – please retry.');
        }
    }
    /* ---------- main-area click: analytics + open modal ---------- */
    function handleCardClick(e) {
        var _a;
        // ignore clicks on the heart button
        if (e.target.closest('button'))
            return;
        if (queryID) {
            (0, insightsClient_1.default)('clickedObjectIDsAfterSearch', {
                index: 'jobs',
                eventName: 'Job clicked',
                queryID,
                objectIDs: [job.objectID],
                positions: [(_a = job.__position) !== null && _a !== void 0 ? _a : 1],
            });
        }
        onOpen();
    }
    return (<article onClick={handleCardClick} className="relative cursor-pointer border rounded p-4 shadow-sm hover:shadow-md transition">
      {/* Save icon */}
      <button onClick={toggleSave} title={saved ? 'Unsave' : 'Save job'} className="absolute right-2 top-2 text-indigo-600 hover:text-indigo-800">
        {saved ? (<solid_1.HeartIcon className="w-5 h-5 fill-red-500"/>) : (<outline_1.HeartIcon className="w-5 h-5"/>)}
      </button>

      <h3 className="font-semibold text-lg pe-6">{job.title}</h3>
      <p className="text-sm text-gray-600">
        {(_a = job.company) !== null && _a !== void 0 ? _a : 'Unknown company'} — {job.location}
      </p>

      {job.salary_estimate && (<p className="text-sm mt-1">
          Est. salary: ${job.salary_estimate.toLocaleString()}
        </p>)}

      <ul className="flex flex-wrap gap-1 mt-2">
        {job.skills.slice(0, 5).map((s) => (<li key={s} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs">
            {s}
          </li>))}
      </ul>
    </article>);
}
