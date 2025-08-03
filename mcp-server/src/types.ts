// src/types.ts
export interface Job {
  objectID: string;            // ← it's a number in your data
  title: string;
  company: string | null;
  location: string | null;
  /** new fields ↓ */
  industry?: string | null;
  tags?: string[];             // some docs have it, some don't
  salary_estimate: number;
  skills?: string[];
  description?: string;
  applyUrl?: string;
  fitScore?: number;           // cultural fit score (0-1) for sorting
}
  
  /** Algolia "hit" structure – a Job plus any extra Algolia metadata. */
export interface JobHit extends Job {
  lastEnrichedAt?: number;          // timestamp the prune script sorts on
  objectID: string;                 // always present in Algolia hits
  embedding?: number[];             // vector embedding for similarity search
  score?: number;                   // search relevance score
  /** Accept any additional fields Algolia injects */
  [key: string]: unknown;
}

/** Redis search response document structure */
export interface RedisSearchDoc {
  id: string | number;
  score?: number | null;
  vectorDistance?: number | null;
  distance?: number | null;
  __dist?: number | null;
  [key: string]: unknown;
}

/** Job record structure for enrichment operations */
export interface JobRecord {
  objectID: string;
  title?: string;
  company?: string | null;
  location?: string | null;
  industry?: string | null;
  tags?: string[];
  salary_estimate?: number;
  skills?: string[];
  description?: string;
  applyUrl?: string;
  embedding?: number[];
  lastEnrichedAt?: number;
  // Additional enrichment fields
  skills_ai?: string[];
  seniority_ai?: 'junior' | 'mid' | 'senior';
  industry_ai?: string;
}

/** AI-enriched job interface for frontend consumption */
export interface JobEnriched {
  objectID: string;
  title: string;
  company: string | null;
  location: string | null;
  salary_estimate?: number;
  description?: string;
  applyUrl?: string;
  
  // Core enrichment fields
  skills: string[];
  tags: string[];
  fitScore: number;           // 0 – 1 cultural fit score
  
  // AI-enhanced fields
  skills_ai?: string[];
  seniority_ai?: 'junior' | 'mid' | 'senior';
  industry_ai?: string;
  
  // Similar jobs (minimal structure for performance)
  similar?: Pick<JobEnriched, 'objectID' | 'title' | 'company' | 'fitScore'>[];
  
  // Algolia/search metadata (optional)
  __queryID?: string;
  __position?: number;
}