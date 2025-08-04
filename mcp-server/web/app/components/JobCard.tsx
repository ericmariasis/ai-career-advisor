
'use client';
import { MouseEvent, useState } from 'react';
import aa from '../insightsClient';        // ★ CHG
import { HeartIcon } from '@heroicons/react/24/solid';
import { HeartIcon as HeartIconOutline } from '@heroicons/react/24/outline';
import { CheckBadgeIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useFavorites } from '../contexts/FavoritesContext';
import { useJobDetails } from '../hooks/useJobDetails';
import { fitColor } from '../lib/fitColor';
import { SimilarJobsDrawer } from './SimilarJobsDrawer';
import { useFavToast } from '../hooks/useFavToast';
import type { Job, JobEnriched } from '../types/job';
import type { SimilarJob } from '../lib/fetchSimilar';

// Export for backward compatibility
export type { Job, JobEnriched };

interface Props {
  job: Job;
    /** May be empty when card comes from the résumé matcher */
  queryID?: string;
  onOpen: () => void;
}

export default function JobCard({
  job,
  queryID,
  onOpen,
}: Props) {
  const { savedSet, toggleFavorite } = useFavorites();
  const jobIdStr = String(job.objectID); // Ensure string type for comparison
  const saved = savedSet.has(jobIdStr);
  const favToast = useFavToast();
  
  // State to track when to fetch enriched data
  const [shouldFetch, setShouldFetch] = useState(false);
  
  // State for similar jobs drawer
  const [showSimilar, setShowSimilar] = useState(false);
  
  // Lazy-load enriched job details
  const { data: enriched, loading } = useJobDetails(shouldFetch ? jobIdStr : undefined);
  
  // Trigger enriched data fetch on hover/focus
  function handleMouseEnter() {
    setShouldFetch(true);
  }
  
  // Handle similar job selection
  function handleSimilarJobSelect(similarJob: SimilarJob) {
    // For now, just close the drawer. In a full app, this would navigate to the job
    console.log('Selected similar job:', similarJob);
    setShowSimilar(false);
    // TODO: Navigate to the selected job or update the current view
  }

  /* ---------- handle "Save" / "Unsave" ---------- */
  async function toggleSave(e: React.MouseEvent) {
    e.stopPropagation();        // don't trigger card click
    const next = !saved;

    try {
      await toggleFavorite(jobIdStr, next);
      // Show toast notification
      favToast(next ? 'add' : 'remove', job.title);
    } catch (err) {
      console.error('Could not save job:', err);
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
      onMouseEnter={handleMouseEnter}
      onFocus={handleMouseEnter}
      className="group relative cursor-pointer border rounded p-4 shadow-sm hover:shadow-md transition"
    >
      {/* Save icon */}
      <button
        onClick={toggleSave}
        title={saved ? 'Unsave' : 'Save job'}
        className="absolute right-2 top-2 text-indigo-600 hover:text-indigo-800 z-10 p-1 bg-white rounded-full shadow-sm"
      >
        {saved ? (
          <HeartIcon className="w-5 h-5 text-red-500" />
        ) : (
          <HeartIconOutline className="w-5 h-5" />
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

      {/* Action buttons */}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowSimilar(true);
          }}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <SparklesIcon className="h-3 w-3" />
          Similar
        </button>
      </div>

      {/* Display base skills or enriched skills if available */}
      {enriched?.skills?.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {enriched.skills.slice(0, 5).map((s) => (
            <span 
              key={s}
              className="rounded bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600"
            >
              {s}
            </span>
          ))}
        </div>
      ) : (
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
      )}

      {/* AI-enhanced skills (additional skills from AI) */}
      {enriched?.skills_ai?.length ? (
        <div className="mt-1 flex flex-wrap gap-1">
          {enriched.skills_ai.slice(0, 3).map((s) => (
            <span 
              key={s}
              className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-600 border border-emerald-200"
            >
              ✨ {s}
            </span>
          ))}
        </div>
      ) : null}

      {/* Cultural fit score */}
      {typeof enriched?.fitScore === 'number' && (
        (() => {
          const [text, bg] = fitColor(enriched.fitScore);
          return (
            <span
              className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${bg} ${text}`}
              title="Predicted culture fit"
            >
              <CheckBadgeIcon className="h-3 w-3" />
              {Math.round(enriched.fitScore * 100)}%
            </span>
          );
        })()
      )}

      {/* Loading indicator */}
      {loading && (
        <span className="mt-2 inline-flex items-center text-xs text-gray-400">
          <SparklesIcon className="mr-1 h-3 w-3 animate-spin" /> enriching&hellip;
        </span>
      )}

      {/* Similar Jobs Drawer */}
      <SimilarJobsDrawer
        jobId={jobIdStr}
        jobTitle={job.title}
        open={showSimilar}
        onClose={() => setShowSimilar(false)}
        onSelectJob={handleSimilarJobSelect}
      />
    </article>
  );
}
