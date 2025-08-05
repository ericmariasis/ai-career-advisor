'use client';

import React from 'react';
import JobCard from './JobCard';
import type { Job } from '../types/job';

interface SuggestionsCarouselProps {
  hits: Job[];
  loading?: boolean;
  onJobSelect?: (job: Job) => void;
}

// Loading skeleton component
const JobCardSkeleton = () => (
  <div className="flex-shrink-0 w-80">
    <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
      {/* Title skeleton */}
      <div className="h-5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-3/4 mb-3 animate-pulse"></div>
      
      {/* Company + Location skeleton */}
      <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-1/2 mb-3 animate-pulse"></div>
      
      {/* Salary skeleton */}
      <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-2/3 mb-3 animate-pulse"></div>
      
      {/* Skills skeleton */}
      <div className="flex gap-1 mb-2">
        <div className="h-6 bg-gradient-to-r from-blue-100 via-blue-200 to-blue-100 rounded-full w-16 animate-pulse"></div>
        <div className="h-6 bg-gradient-to-r from-green-100 via-green-200 to-green-100 rounded-full w-20 animate-pulse"></div>
        <div className="h-6 bg-gradient-to-r from-purple-100 via-purple-200 to-purple-100 rounded-full w-12 animate-pulse"></div>
      </div>
      
      {/* Score skeleton */}
      <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-1/3 animate-pulse"></div>
    </div>
  </div>
);

export default function SuggestionsCarousel({ hits, loading = false, onJobSelect }: SuggestionsCarouselProps) {
  if (!loading && !hits.length) return null;

  return (
    <section className="mt-8">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">🔍 Semantic Suggestions</h3>
        <p className="text-sm text-gray-600">
          {loading 
            ? "Finding semantically similar jobs..." 
            : "No exact matches found? These jobs are semantically similar to your search."
          }
        </p>
      </div>
      
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {loading ? (
          // Show 3 skeleton cards while loading
          Array.from({ length: 3 }).map((_, idx) => (
            <JobCardSkeleton key={`skeleton-${idx}`} />
          ))
        ) : (
          hits.map((job) => (
            <div key={job.objectID} className="flex-shrink-0 w-80">
              <JobCard
                job={job}
                queryID="similar-suggestions"
                onOpen={() => onJobSelect?.(job)}
              />
            </div>
          ))
        )}
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        💡 These recommendations are powered by vector similarity search
      </div>
    </section>
  );
}