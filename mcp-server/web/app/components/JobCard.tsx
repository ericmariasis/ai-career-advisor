
'use client';
import { MouseEvent, useState } from 'react';
import axios from 'axios';
import aa, { getUserToken } from '../insightsClient';        // ★ CHG
import { HeartIcon as HeartSolid }   from '@heroicons/react/24/solid';
import { HeartIcon as HeartOutline } from '@heroicons/react/24/outline';

export type Job = {
  objectID: string;
  title: string;
  company?: string | null;
  location: string;
  salary_estimate?: number;
  skills: string[];

  // Algolia meta added in page.tsx
  __queryID?: string;
  __position?: number;
  
  /* NEW optional fields used by the modal.
     They’re safe to leave undefined for now. */
  description?: string;
  applyUrl?: string;
};

interface Props {
  job: Job;
    /** May be empty when card comes from the résumé matcher */
  queryID?: string;
  initiallySaved?: boolean;           // ★ NEW
  onToggle?: (id: string, saved: boolean) => void; // ★ NEW
  onOpen: () => void;
}

export default function JobCard({
  job,
  queryID,
  initiallySaved = false,
  onToggle,
  onOpen,
}: Props) {
  const [saved, setSaved] = useState(initiallySaved);
  const userToken = getUserToken();

  /* ---------- handle “Save” / “Unsave” ---------- */
  async function toggleSave(e: React.MouseEvent) {
    e.stopPropagation();        // don’t trigger card click
    const next = !saved;

    try {
      await axios.post('/api/favorites', {
        objectID:  job.objectID,
         ...(queryID  ? { queryID } : {}),
         ...(job.__position
            ? { position: job.__position }
            : {}),
        userToken,
        save: next,
      });
      setSaved(next);
      onToggle?.(job.objectID, next);
    } catch (err) {
      console.error(err);
      alert('Could not save job – please retry.');
    }
  }

    /* ---------- main-area click: analytics + open modal ---------- */
    function handleCardClick(e: MouseEvent) {
      // ignore clicks on the heart button
      if ((e.target as HTMLElement).closest('button')) return;
  
      if (queryID) {
        aa('clickedObjectIDsAfterSearch', {
          index: 'jobs',
          eventName: 'Job clicked',
          queryID,
          objectIDs: [job.objectID],
          positions: [job.__position ?? 1],
        });
      }
  
      onOpen();
  }

  return (
    <article
      onClick={handleCardClick}
      className="relative cursor-pointer border rounded p-4 shadow-sm hover:shadow-md transition"
    >
      {/* Save icon */}
      <button
        onClick={toggleSave}
        title={saved ? 'Unsave' : 'Save job'}
        className="absolute right-2 top-2 text-indigo-600 hover:text-indigo-800"
      >
        {saved ? (
          <HeartSolid className="w-5 h-5 fill-red-500" />
        ) : (
          <HeartOutline className="w-5 h-5" />
        )}
      </button>

      <h3 className="font-semibold text-lg pe-6">{job.title}</h3>
      <p className="text-sm text-gray-600">
        {job.company ?? 'Unknown company'} — {job.location}
      </p>

      {job.salary_estimate && (
        <p className="text-sm mt-1">
          Est. salary: ${job.salary_estimate.toLocaleString()}
        </p>
      )}

      <ul className="flex flex-wrap gap-1 mt-2">
        {job.skills.slice(0, 5).map((s) => (
          <li
            key={s}
            className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs"
          >
            {s}
          </li>
        ))}
      </ul>
    </article>
  );
}
