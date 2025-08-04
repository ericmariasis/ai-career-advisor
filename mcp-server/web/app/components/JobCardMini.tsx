import { CheckBadgeIcon } from '@heroicons/react/24/outline';
import { fitColor } from '../lib/fitColor';
import type { SimilarJob } from '../lib/fetchSimilar';

export function JobCardMini({ job, onSelect }: { 
  job: SimilarJob; 
  onSelect?: (job: SimilarJob) => void;
}) {
  const [text, bg] = fitColor(job.fitScore ?? 0);
  
  return (
    <div
      onClick={() => onSelect?.(job)}
      className="block rounded-md p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
    >
      <h3 className="font-medium text-sm">{job.title}</h3>
      <p className="text-xs text-gray-800">
        {job.company || 'Unknown company'} • {job.location}
      </p>
      
      {job.salary_estimate && (
        <p className="text-xs text-gray-700 mt-1">
          Est. ${job.salary_estimate.toLocaleString()}
        </p>
      )}
      
      {typeof job.fitScore === 'number' && (
        <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${bg} ${text}`}>
          <CheckBadgeIcon className="h-3 w-3" />
          {Math.round(job.fitScore * 100)}%
        </span>
      )}
      
      {typeof job.score === 'number' && (
        <div className="text-[10px] text-gray-700 mt-1">
          {Math.round(job.score * 100)}% similar
        </div>
      )}
    </div>
  );
}