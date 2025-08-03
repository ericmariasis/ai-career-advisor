'use client';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useEffect, useState, Fragment } from 'react';
import { fetchSimilar, SimilarJob } from '../lib/fetchSimilar';
import { JobCardMini } from './JobCardMini';

export function SimilarJobsDrawer({
  jobId,
  jobTitle,
  open,
  onClose,
  onSelectJob,
}: {
  jobId: string;
  jobTitle?: string;
  open: boolean;
  onClose(): void;
  onSelectJob?: (job: SimilarJob) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<SimilarJob[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!open || !jobId) return;
    
    setLoading(true);
    setError(undefined);
    setJobs([]);
    
    fetchSimilar(jobId)
      .then(recommendations => {
        setJobs(recommendations);
        if (recommendations.length === 0) {
          setError('No similar jobs found for this position.');
        }
      })
      .catch(e => {
        console.error('Failed to fetch similar jobs:', e);
        setError('Unable to load similar jobs. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [open, jobId]);

  const handleSelectJob = (job: SimilarJob) => {
    onSelectJob?.(job);
    onClose();
  };

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col bg-white shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4">
                      <div className="flex items-center gap-2">
                        <SparklesIcon className="h-5 w-5 text-indigo-600" />
                        <Dialog.Title className="text-lg font-medium text-gray-900">
                          Similar Jobs
                        </Dialog.Title>
                      </div>
                      <button
                        onClick={onClose}
                        className="rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Subtitle */}
                    {jobTitle && (
                      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                        <p className="text-sm text-gray-600">
                          Jobs similar to: <span className="font-medium">{jobTitle}</span>
                        </p>
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto">
                      {loading && (
                        <div className="p-4 text-center">
                          <SparklesIcon className="h-8 w-8 mx-auto text-gray-400 animate-spin mb-2" />
                          <p className="text-sm text-gray-500">Finding similar positions...</p>
                        </div>
                      )}
                      
                      {error && (
                        <div className="p-4 text-center">
                          <p className="text-sm text-red-600">{error}</p>
                        </div>
                      )}
                      
                      {!loading && !error && jobs.length === 0 && (
                        <div className="p-4 text-center">
                          <SparklesIcon className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                          <p className="text-sm text-gray-500">No similar openings found.</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Try searching for jobs with similar skills or titles.
                          </p>
                        </div>
                      )}

                      {jobs.length > 0 && (
                        <div className="divide-y divide-gray-100">
                          {jobs.map(job => (
                            <JobCardMini 
                              key={job.objectID} 
                              job={job} 
                              onSelect={handleSelectJob}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    {jobs.length > 0 && (
                      <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
                        <p className="text-xs text-gray-500 text-center">
                          Found {jobs.length} similar position{jobs.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}