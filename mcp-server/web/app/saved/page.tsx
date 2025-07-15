/* eslint-disable react-hooks/exhaustive-deps */
'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import JobCard from '../components/JobCard';
import JobModal from '../components/JobModal';
import { getUserToken } from '../insightsClient';
import type { Job } from '@/types';

export default function SavedPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Job | null>(null);

  /* fetch saved IDs + details */
  useEffect(() => {
    (async () => {
      try {
        const userToken = getUserToken();
        const { data } = await axios.get<Job[]>(
          '/api/favorites/details',
          { params: { userToken } }
        );
        setJobs(data);
        setSavedSet(new Set(data.map((j) => j.objectID)));
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  /* unsave helper */
  async function toggleSave(job: Job, save: boolean) {
    try {
      await axios.post('/api/favorites', {
        objectID: job.objectID,
        userToken: getUserToken(),
        save,
      });
      setSavedSet((prev) => {
        const next = new Set(prev);
        save ? next.add(job.objectID) : next.delete(job.objectID);
        return next;
      });
      setJobs((prev) => prev.filter((j) => j.objectID !== job.objectID));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
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
            initiallySaved={savedSet.has(job.objectID)}
            onToggle={(id, save) => toggleSave(job, save)}
            onOpen={() => setSelected(job)}
          />
        ))}
      </div>

      <JobModal
        job={selected}
        saved={selected ? savedSet.has(selected.objectID) : false}
        onClose={() => setSelected(null)}
        onToggleSave={toggleSave}
      />
    </main>
  );
}
