// Shared frontend types for job-related interfaces

/** Basic job interface matching backend */
export interface Job {
  objectID: string;
  title: string;
  company?: string | null;
  location: string;
  salary_estimate?: number;
  skills: string[];
  description?: string;
  applyUrl?: string;
  fitScore?: number;           // cultural fit score (0-1) for sorting

  // Algolia meta added in search results
  __queryID?: string;
  __position?: number;
}

/** AI-enriched job interface for enhanced UI features */
export interface JobEnriched extends Job {
  // Ensure non-optional core fields for enriched jobs
  company: string | null;
  tags: string[];
  fitScore: number;           // 0 – 1 cultural fit score
  
  // AI-enhanced fields
  skills_ai?: string[];
  seniority_ai?: 'junior' | 'mid' | 'senior';
  industry_ai?: string;
  
  // Similar jobs (minimal structure for performance)
  similar?: Pick<JobEnriched, 'objectID' | 'title' | 'company' | 'fitScore'>[];
}

/** Backward compatibility type alias */
export type { Job as JobBasic };