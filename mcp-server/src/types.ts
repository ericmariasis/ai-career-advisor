// src/types.ts
export interface Job {
    objectID: string;
    title: string;
    company?: string | null;
    location: string;
    salary_estimate?: number;
    skills: string[];
    description?: string;
    applyUrl?: string;
  }
  
  /** Algolia “hit” structure – a Job plus any extra Algolia metadata. */
export interface JobHit extends Job {
  lastEnrichedAt?: number;          // timestamp the prune script sorts on
  objectID: string;                 // always present in Algolia hits
  /** Accept any additional fields Algolia injects */
  [key: string]: any;
}
