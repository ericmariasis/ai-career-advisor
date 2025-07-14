/* eslint-disable react/require-default-props */
'use client';
import aa from '../insightsClient';        // ← use the inited client
import { HeroCheckCircle } from '@heroicons/react/24/solid';

export type Job = {
  objectID: string;
  title: string;
  company?: string | null;
  location: string;
  salary_estimate?: number;
    skills: string[];

  // extra Algolia meta (present when you requested clickAnalytics=true)
  __queryID?: string;
  __position?: number;
};

interface Props {
      job: Job;
      queryID: string;      // always provided by the parent now
      position: number;     // always provided
    }
    
    export default function JobCard({ job, queryID, position }: Props) {
    
      const handleClick = () => {
            const qid = job.__queryID ?? queryID;
    
        if (qid) {
          aa('clickedObjectIDsAfterSearch', {
            index: 'jobs',          // 🚨 must match your Algolia index name
            eventName: 'Job clicked',
                    queryID:   qid,
                    objectIDs: [job.objectID],
                    positions: [position],
          });
        }
    
        // later: open a modal / navigate to /jobs/[id]
      };
    
  return (
        <article
      onClick={handleClick}
      className="cursor-pointer border rounded p-4 shadow-sm hover:shadow-md transition"
    >
      <h3 className="font-semibold text-lg">{job.title}</h3>
      <p className="text-sm text-gray-600">
        {job.company ?? 'Unknown company'} — {job.location}
      </p>

      {job.salary_estimate && (
        <p className="text-sm mt-1">
          Est. salary: ${job.salary_estimate.toLocaleString()}
        </p>
      )}

      <ul className="flex flex-wrap gap-1 mt-2">
        {job.skills.slice(0, 5).map(s => (
          <li key={s} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs">
            {s}
          </li>
        ))}
      </ul>

      {/* TODO: Add “Save” / “More info” actions later */}
    </article>
  );
}
