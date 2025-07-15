import { Router } from 'express';
import { extractSkills } from '../utils/extractSkills';
import { jobsIndex }     from '../algolia';
import { openai, OPENAI_MODEL } from '../openai';   // ← NEW

const router = Router();

/**  POST /api/resume  { resumeText: string } */
router.post('/', async (req, res) => {
  try {
    const { resumeText } = req.body;
    if (!resumeText) {
      return res.status(400).json({ error: 'resumeText required' });
    }

    /* ---------- 1. keyword skills ---------- */
    const kwSkills = extractSkills(resumeText);

    /* ---------- 2. LLM-enriched skills ---------- */
    const aiResp = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0,
      max_tokens: 60,
      messages: [
        {
          role: 'system',
          content:
            'Extract a concise comma-separated list (max 10) of technical skills / tools mentioned in this résumé text.',
        },
        { role: 'user', content: resumeText.slice(0, 4_000) }, // truncate huge CVs
      ],
    });

    const raw  = aiResp.choices[0].message.content ?? '';
    const aiSkills = raw
    .split(/[,;\n]/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)                              // remove ‘‘’’
    .filter(s => s.length >= 3)                   // ≥ 3 characters
    .filter(s => s.split(/\s+/).length <= 3);     // ≤ 3 words

    // merge + dedupe, preserve order of appearance if you wish
    const skills = Array.from(new Set([...kwSkills, ...aiSkills]));

    /* ---------- 1 ½.  EMPTY-SKILL GUARD  ---------- */
if (skills.length === 0) {
    return res
      .status(400)
      .json({ error: 'No recognizable skills found in résumé text.' });
  }

/* ---------- 3. Algolia query ---------- */
// 3-a  strict recall (optional, fine to keep for now)
const strictFilter = skills
  .map(s => `skills:"${s.replace(/"/g, '\\"')}"`)
  .join(' OR ');

// 3-b  optional filters, each worth 1 pt
const optionalFilters = skills.map(
  s => `skills:"${s.replace(/"/g, '\\"')}"<score=1>`
);

// --- search ---
const { hits } = await jobsIndex.search('*', {      // <- use * to keep recall
  filters: strictFilter,          // comment out if you want even broader recall
  optionalFilters,                // boosts by #-skills matched
  sumOrFiltersScores: true,       // returns the summed score
  getRankingInfo: true,           // returns _rankingInfo
  hitsPerPage: 20,
  clickAnalytics: true,
});

console.log('First hit ranking info:', hits[0]?._rankingInfo);

res.json({ skills, hits });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'resume match failed' });
  }
});

router.post('/feedback', async (req, res) => {
    const { resumeText } = req.body;
    if (!resumeText) {
      return res.status(400).json({ error: 'Missing resumeText' });
    }
  
    try {
      const system = `You are an expert career coach. Given a candidate's résumé text and a set of 
  job requirements, identify 3–5 key skills the candidate lacks that are highly relevant for data 
  science roles. Then recommend concrete learning resources or next steps for each missing skill. 
  Be concise.`;
      const user = `Résumé:\n${resumeText}\n\nExample requirements:
  • Proficiency in Python, SQL, machine learning frameworks
  • Experience with cloud platforms (AWS/Azure/GCP)
  • Strong data visualization and communication skills`;
  
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        temperature: 0,
        max_tokens: 300,
        messages: [
          { role: 'system', content: system },
          { role: 'user',   content: user   },
        ],
      });
  
      const feedback = completion.choices[0].message?.content?.trim() || '';
      return res.json({ feedback });
    } catch (err) {
      console.error('Résumé feedback error', err);
      return res.status(500).json({ error: 'Failed to generate résumé feedback' });
    }
  });

export default router;
