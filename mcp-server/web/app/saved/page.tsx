
'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import JobCard from '../components/JobCard';
import JobModal from '../components/JobModal';
import { getUserToken } from '../insightsClient';
import type { Job } from '../types/job';
import { useFavorites } from '../contexts/FavoritesContext';

export default function SavedPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState<Job | null>(null);
  const { savedSet, toggleFavorite } = useFavorites();

  /* fetch saved job details */
  useEffect(() => {
    (async () => {
      try {
        const userToken = getUserToken();
        const { data } = await axios.get<Job[]>(
          '/api/favorites/details',
          { params: { userToken } }
        );
        setJobs(data);
      } catch (err) {
        console.error('Could not load saved jobs', err);
      }
    })();
  }, [savedSet]); // Re-fetch when savedSet changes

  /* unsave helper */
  async function toggleSave(job: Job, save: boolean) {
    try {
      await toggleFavorite(String(job.objectID), save);
      // Remove from local jobs list if unsaved
      if (!save) {
        setJobs((prev) => prev.filter((j) => String(j.objectID) !== String(job.objectID)));
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6 bg-white min-h-screen">
      <h1 className="text-2xl font-bold">Saved Jobs</h1>

      {jobs.length === 0 && (
        <p className="text-sm text-gray-400">No jobs saved yet.</p>
      )}

      <div className="grid gap-4">
        {jobs.map((job, idx) => (
          <JobCard
            key={job.objectID}
            job={{ ...job, __position: idx + 1 }}
            queryID=""                 // no search context
            onOpen={() => setSelected(job)}
          />
        ))}
      </div>

      <JobModal
        job={selected}
        saved={selected ? savedSet.has(String(selected.objectID)) : false}
        onClose={() => setSelected(null)}
        onToggleSave={toggleSave}
      />
    </main>
  );
}
