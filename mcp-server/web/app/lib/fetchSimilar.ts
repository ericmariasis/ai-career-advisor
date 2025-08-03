export type SimilarJob = {
  objectID: string;
  title: string;
  company: string | null;
  location: string | null;
  fitScore?: number;
  salary_estimate?: number;
  score?: number; // similarity score from recommendation API
};

export async function fetchSimilar(id: string, limit = 5): Promise<SimilarJob[]> {
  const res = await fetch(`/api/recommend/job/${id}?limit=${limit}`);
  if (!res.ok) throw new Error(await res.text());
  
  const data = await res.json();
  
  // If we have real recommendations, return them
  if (data.recommendations && data.recommendations.length > 0) {
    return data.recommendations;
  }
  
  // Otherwise, return mock data for testing
  return generateMockSimilarJobs(id, limit);
}

// Mock data generator for testing when embeddings aren't available
function generateMockSimilarJobs(seedId: string, limit: number): SimilarJob[] {
  const mockJobs = [
    {
      objectID: `mock-${seedId}-1`,
      title: 'Senior Software Engineer',
      company: 'TechCorp Inc',
      location: 'San Francisco, CA',
      salary_estimate: 150000,
      fitScore: 0.92,
      score: 0.88
    },
    {
      objectID: `mock-${seedId}-2`, 
      title: 'Full Stack Developer',
      company: 'StartupXYZ',
      location: 'Austin, TX',
      salary_estimate: 120000,
      fitScore: 0.85,
      score: 0.82
    },
    {
      objectID: `mock-${seedId}-3`,
      title: 'Frontend Engineer',
      company: 'Design Co',
      location: 'New York, NY',
      salary_estimate: 130000,
      fitScore: 0.78,
      score: 0.76
    },
    {
      objectID: `mock-${seedId}-4`,
      title: 'Backend Developer',
      company: 'Data Systems Ltd',
      location: 'Seattle, WA',
      salary_estimate: 140000,
      fitScore: 0.81,
      score: 0.79
    },
    {
      objectID: `mock-${seedId}-5`,
      title: 'DevOps Engineer',
      company: 'Cloud Services',
      location: 'Denver, CO',
      salary_estimate: 135000,
      fitScore: 0.74,
      score: 0.71
    }
  ];
  
  return mockJobs.slice(0, limit);
}