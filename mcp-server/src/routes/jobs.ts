// src/routes/jobs.ts
import { Router, Request, Response } from 'express';
import { redisConn } from '../lib/redisSearch';
import type { JobEnriched } from '../types';

const router = Router();

/**
 * GET /api/jobs/:id - Fetch enriched job details
 * Returns AI-enhanced job data including fitScore, skills_ai, etc.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const r = await redisConn();
    const jobKey = `job:${req.params.id}`;

    // Fetch job data from Redis
    const jobData = await r.json.get(jobKey, { path: '.' }) as any;
    
    if (!jobData) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Transform to JobEnriched format with AI-enhanced fields
    const enrichedJob: JobEnriched = {
      objectID: jobData.objectID || req.params.id,
      title: jobData.title || '',
      company: jobData.company || null,
      location: jobData.location || null,
      salary_estimate: jobData.salary_estimate,
      description: jobData.description,
      applyUrl: jobData.applyUrl,
      
      // Core enrichment fields
      skills: jobData.skills || [],
      tags: jobData.tags || [],
      fitScore: jobData.fitScore || generateMockFitScore(jobData), // Mock for now
      
      // AI-enhanced fields (these would come from AI enrichment process)
      skills_ai: jobData.skills_ai || extractAISkills(jobData),
      seniority_ai: jobData.seniority_ai || determineSeniority(jobData),
      industry_ai: jobData.industry_ai || jobData.industry,
      
      // Similar jobs will be handled separately via existing /api/recommend endpoint
      similar: undefined
    };

    res.json(enrichedJob);
  } catch (error) {
    console.error('Error fetching job details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Generate a consistent mock cultural fit score (0-1) based on job characteristics
 * In production, this would come from AI analysis
 */
function generateMockFitScore(jobData: any): number {
  // Create a deterministic score based on job properties for consistency
  const title = (jobData.title || '').toLowerCase();
  const company = (jobData.company || '').toLowerCase();
  const location = (jobData.location || '').toLowerCase();
  const salary = jobData.salary_estimate || 0;
  
  // Create a simple hash from job properties for consistency
  let hash = 0;
  const str = `${title}-${company}-${location}-${salary}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert hash to a score between 0.6-0.95
  const normalizedHash = Math.abs(hash) % 100;
  return Math.round((0.6 + (normalizedHash / 100) * 0.35) * 100) / 100;
}

/**
 * Extract AI-enhanced skills from job data
 * In production, this would use ML to extract additional skills
 */
function extractAISkills(jobData: any): string[] {
  const baseSkills = jobData.skills || [];
  const description = jobData.description || '';
  const title = jobData.title || '';
  
  // Mock AI skill extraction based on common patterns
  const aiSkills: string[] = [];
  
  // Add skills based on job title patterns
  if (title.toLowerCase().includes('senior')) {
    aiSkills.push('Leadership', 'Mentoring');
  }
  if (title.toLowerCase().includes('manager')) {
    aiSkills.push('Team Management', 'Strategic Planning');
  }
  if (title.toLowerCase().includes('engineer')) {
    aiSkills.push('Problem Solving', 'Technical Design');
  }
  
  // Add skills based on description keywords
  if (description.toLowerCase().includes('agile')) {
    aiSkills.push('Agile Methodology');
  }
  if (description.toLowerCase().includes('remote')) {
    aiSkills.push('Remote Collaboration');
  }
  
  // Return unique skills not already in base skills
  return aiSkills.filter(skill => 
    !baseSkills.some((baseSkill: string) => 
      baseSkill.toLowerCase() === skill.toLowerCase()
    )
  );
}

/**
 * Determine seniority level from job data
 * In production, this would use ML classification
 */
function determineSeniority(jobData: any): 'junior' | 'mid' | 'senior' {
  const title = (jobData.title || '').toLowerCase();
  const salary = jobData.salary_estimate || 0;
  
  if (title.includes('senior') || title.includes('lead') || title.includes('principal')) {
    return 'senior';
  }
  if (title.includes('junior') || title.includes('entry') || salary < 60000) {
    return 'junior';
  }
  return 'mid';
}

export default router;