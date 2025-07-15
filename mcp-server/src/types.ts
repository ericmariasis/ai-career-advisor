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
  