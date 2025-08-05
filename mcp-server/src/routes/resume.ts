import { Router } from 'express';
import { extractSkills }        from '../utils/extractSkills';
import { redisConn } from '../lib/redisSearch';
import { openai, OPENAI_MODEL } from '../openai';
import { countTokens }          from '../lib/tokens';
import { createHash } from 'crypto';
import { getCachedAnswer, putCachedAnswer } from '../lib/semcache';


const router = Router();

/* ---------- token‑guard constants ---------- */
const TOKEN_LIMIT  = 7_000;   // soft cap (hard = 8 192)
const TRUNC_TARGET = 6_500;   // what we aim for after trimming

/**  POST /api/resume  { resumeText: string } */
router.post('/', async (req, res) => {
  try {
        const { resumeText } = req.body as { resumeText?: unknown };
        if (resumeText === undefined || resumeText === null) {
      return res.status(400).json({ error: 'resumeText required' });
    }

    /* ---------- 1. token guard ---------- */
        // ☑️ Always work with a bona‑fide string
          /* ----------------------------------------------------------
             PowerShell's  ConvertTo‑Json  wraps long strings like so:
               { resumeText: { value: "<real‑text>", Count: 123456 } }
             Detect that case and unwrap the  .value  property.          */
        
          const rawResume: string = (() => {
            if (typeof resumeText === 'string') return resumeText;           // normal case
            if (Buffer.isBuffer(resumeText))   return resumeText.toString();
        
            // PowerShell wrapper: { value: "<string>", Count: n }
            if (resumeText && typeof resumeText === 'object' && 'value' in resumeText) {
              const v = (resumeText as any).value;
              if (typeof v === 'string') return v;
            }
        
            // Fallback – stringify whatever it is (keeps old behaviour)
            return String(resumeText);
          })();

        console.log('[resume] received chars:', rawResume.length);
    
        /* ---------- 1. token guard ---------- */
        let tokens     = await countTokens(rawResume);
        let inputText  = rawResume;

    if (tokens > TOKEN_LIMIT) {
      const ratio   = TRUNC_TARGET / tokens;             // ≈ 0‑1
      const cut     = Math.floor(rawResume.length * ratio);
      inputText     = rawResume.slice(0, cut);
      tokens        = await countTokens(inputText);

      console.warn(
        `[resume] truncated from ${rawResume.length} → ${inputText.length} chars (${tokens} tokens)`
      );
    }
    
    /* ---------- 2‑a. regex skills ---------- */
    const kwSkills: string[] = extractSkills(rawResume);

/* ---------- 2‑b. LLM‑enriched skills (semantic cache) ---------- */
const sePrompt = '[SkillExtract] ' + rawResume;
const seHit    = await getCachedAnswer('skill_extract', sePrompt);

let aiSkillsRaw: string;
if (seHit) {
  console.log(`[cache] skill_extract hit (sim=${seHit.similarity.toFixed(2)})`);
  aiSkillsRaw = seHit.answer;
} else {
  const aiResp = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0,
    max_tokens: 60,
    messages: [
      {
        role: 'system',
        content:
          'Extract a concise comma‑separated list (max 10) of technical skills / tools mentioned in this résumé text.',
      },
      { role: 'user', content: rawResume.slice(0, 4_000) },
    ],
  });
  aiSkillsRaw = aiResp.choices[0].message.content ?? '';
  await putCachedAnswer('skill_extract', sePrompt, aiSkillsRaw);
}

    const aiSkills: string[] = aiSkillsRaw
      .split(/[,;\n]/)
      .map((s: string) => s.trim().toLowerCase())
      .filter((s: string) => !!s)                       // non‑empty
      .filter((s: string) => s.length >= 3)             // ≥ 3 chars
      .filter((s: string) => s.split(/\s+/).length <= 3); // ≤ 3 words

    /* ---------- 2‑c. merge & dedupe ---------- */
    const skills = Array.from(new Set([...kwSkills, ...aiSkills]));

    if (skills.length === 0) {
      return res
        .status(400)
        .json({ error: 'No recognizable skills found in résumé text.' });
    }

/* ---------- 3. Skills-based job search ---------- */
const r = await redisConn();

// Use skills to find matching jobs via Redis search
const skillsQuery = skills.map(skill => `@skills:{${skill.replace(/[^a-zA-Z0-9\s]/g, '')}}`).join(' | ');
console.log('[resume] skills query:', skillsQuery);

let searchResults;
try {
  searchResults = await r.ft.search(
    'jobsIdx',
    skillsQuery || '*', // fallback to all jobs if no skills
    {
      LIMIT: { from: 0, size: 20 },
      DIALECT: 3,
      RETURN: ['2', '$', 'AS', 'json']
    }
  );
} catch (searchErr) {
  console.error('[resume] Search error:', searchErr);
  // Fallback to basic search
  searchResults = await r.ft.search(
    'jobsIdx',
    '*',
    {
      LIMIT: { from: 0, size: 20 },
      DIALECT: 3,
      RETURN: ['2', '$', 'AS', 'json']
    }
  );
}

const total = (searchResults as any).total as number;
const documents = (searchResults as any).documents as {
  value: { json: string };
  id: string;
}[];

if (total === 0) {
  return res.json({
    skills,
    recommendations: [],
    truncated: rawResume.length !== inputText.length,
    vectorEmbeddedTokens: tokens,
  });
}

// Parse and score the results based on skill overlap
const jobs = documents.map(doc => {
  const parsed = JSON.parse(doc.value.json);
  const jobData = Array.isArray(parsed) ? parsed[0] : parsed;
  
  // Calculate simple skill overlap score
  const jobSkills = jobData.skills || [];
  const overlap = skills.filter(skill => 
    jobSkills.some((jobSkill: string) => 
      jobSkill.toLowerCase().includes(skill.toLowerCase()) ||
      skill.toLowerCase().includes(jobSkill.toLowerCase())
    )
  ).length;
  
  const score = overlap / Math.max(skills.length, 1); // normalize by number of skills
  
  return {
    ...jobData,
    score: Math.round(score * 100) / 100 // round to 2 decimal places
  };
});

const recommendations = jobs
  .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))  // high-score first
  .slice(0, 10);                                     // top-10

    const truncated = rawResume.length !== inputText.length;
    return res.json({
            skills,                  // still useful for UI
            recommendations,         // skills-based matches from Redis
      truncated,
      vectorEmbeddedTokens: tokens,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'resume match failed' });
  }
});

/* ---------- coaching feedback ---------- */
router.post('/feedback', async (req, res) => {
  const { resumeText } = req.body as { resumeText?: unknown };
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
const fbPrompt = '[TechSkillFeedback] ' + resumeText;
const fbHit    = await getCachedAnswer('tech_skill_extract', fbPrompt);

let feedback: string;
if (fbHit) {
  console.log(`[cache] tech_skill_extract hit (sim=${fbHit.similarity.toFixed(2)})`);
  feedback = fbHit.answer.trim();
} else {
  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0,
    max_tokens: 300,
    messages: [
      { role: 'system', content: system },
      { role: 'user',   content: user   },
    ],
  });
  feedback = completion.choices[0].message?.content?.trim() || '';
  await putCachedAnswer('tech_skill_extract', fbPrompt, feedback);
}
return res.json({ feedback });

  } catch (err) {
    console.error('Résumé feedback error', err);
    return res.status(500).json({ error: 'Failed to generate résumé feedback' });
  }
});

export default router;