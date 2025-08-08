'use client';

import { Fragment, useEffect, useState } from 'react';
import axios from 'axios';
import JobCard from './JobCard';
import { Dialog, Transition } from '@headlessui/react';
import aa, { getUserToken } from '../insightsClient';
import type { Job } from '../types/job';

interface Props {
  job: Job | null;
  onClose: () => void;
  /** whether this job is already saved */
  saved: boolean;
  /** toggle save  */
  onToggleSave: (job: Job, save: boolean) => void;
}

export default function JobModal({ job, onClose, saved, onToggleSave }: Props) {
    const [similar, setSimilar] = useState<Job[]>([]);
  // fire Algolia “view” event
  useEffect(() => {
    if (!job) return;
    aa('viewedObjectIDs', {
      index: 'jobs',
      eventName: 'Job viewed',
      objectIDs: [String(job.objectID)],
    });
  }, [job]);

  
  // ★ NEW: fetch “similar” jobs whenever this modal opens
  useEffect(() => {
    if (!job) {
      setSimilar([]);
      return;
    }
    (async () => {
      try {
        const { data } = await axios.get<Job[]>(
          `/api/recommend/job/${job.objectID}`
        );
        setSimilar(data);
      } catch (err) {
        console.error('Failed to load similar jobs', err);
      }
    })();
  }, [job]);

  if (!job) return null;

  return (
    <Transition.Root show={!!job} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-start justify-center p-4 sm:p-8 overflow-y-auto">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 translate-y-6 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-6 sm:translate-y-0 sm:scale-95"
          >
        <Dialog.Panel className="w-full sm:max-w-lg lg:max-w-2xl transform rounded-2xl bg-zinc-900 text-zinc-100 p-6 shadow-2xl ring-1 ring-zinc-700/50 transition-all">
              {/* header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Dialog.Title className="text-xl font-semibold text-zinc-100">
                    {job.title}
                  </Dialog.Title>
                  <p className="text-sm text-zinc-400">
                    {job.company} – {job.location}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Save / unsave */}
                  <button
                    onClick={() => onToggleSave(job, !saved)}
                    className="text-red-500 hover:text-red-600 p-1"
                    aria-label={saved ? 'Unsave job' : 'Save job'}
                  >
                    {saved ? '♥' : '♡'}
                  </button>
                  
                  {/* Close button */}
                  <button
                    onClick={onClose}
                    className="text-zinc-400 hover:text-zinc-300 p-1 transition-colors"
                    aria-label="Close modal"
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <hr className="my-4" />

              {/* description */}
              <div className="prose max-w-none text-sm leading-relaxed">
                {job.description?.split('\n').map((p) => (
                  <p key={p.slice(0, 20)}>{p}</p>
                ))}
              </div>

              {/* skills */}
              {job.skills?.length && (
                <>
                  <h3 className="mt-6 mb-2 font-medium">Key skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-600"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </>
              )}

              {/* apply */}
              {job.applyUrl && (
                <a
                  href={job.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Apply on company site →
                </a>
              )}
              
              {/* ★ NEW: “You might also like” */}
              {similar.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium">You might also like</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    {similar.map((s) => (
                      <JobCard
                        key={s.objectID}
                        job={s}
                        queryID=""            // not from a search
                        onOpen={() => {}}
                      />
                    ))}
                  </div>
                </div>
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
