import { useState, useEffect } from 'react';
import type { JobEnriched } from '../types/job';

export function useJobDetails(id?: string) {
  const [data, setData] = useState<JobEnriched | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id || data?.objectID === id) return;
    let canceled = false;
    
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/jobs/${id}`);
        if (!res.ok) throw new Error(res.statusText);
        const json: JobEnriched = await res.json();
        if (!canceled) setData(json);
      } catch (e) {
        console.error('job details fetch failed', e);
      } finally {
        if (!canceled) setLoading(false);
      }
    })();
    
    return () => {
      canceled = true;
    };
  }, [id, data?.objectID]);

  return { data, loading };
}