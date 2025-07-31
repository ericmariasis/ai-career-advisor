import { Router } from 'express';
import { extractSkills }        from '../utils/extractSkills';
import { redisConn, knnSearch } from '../lib/redisSearch';
import { openai, OPENAI_MODEL } from '../openai';
import { countTokens }          from '../lib/tokens';
import { createHash } from 'crypto';
import { getCachedAnswer, putCachedAnswer } from '../lib/semcache';


const router = Router();

/* ---------- token‑guard constants ---------- */
const EMBED_MODEL  = 'text-embedding-ada-002';
const TOKEN_LIMIT  = 7_000;   // soft cap (hard = 8 192)
const TRUNC_TARGET = 6_500;   // what we aim for after trimming

/**  POST /api/resume  { resumeText: string } */
router.post('/', async (req, res) => {
  try {
        const { resumeText } = req.body as { resumeText?: unknown };
        if (resumeText === undefined || resumeText === null) {
      return res.status(400).json({ error: 'resumeText required' });
    }

    /* ---------- 1. token guard ---------- */
        // ☑️ Always work with a bona‑fide string
          /* ----------------------------------------------------------
             PowerShell’s  ConvertTo‑Json  wraps long strings like so:
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
      const ratio   = TRUNC_TARGET / tokens;             // ≈ 0‑1
      const cut     = Math.floor(rawResume.length * ratio);
      inputText     = rawResume.slice(0, cut);
      tokens        = await countTokens(inputText);

      console.warn(
        `[resume] truncated from ${rawResume.length} → ${inputText.length} chars (${tokens} tokens)`
      );
    }
    const hash = createHash('sha256').update(inputText).digest('hex');
    const cacheKey = `cv:${hash}`;
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
          'Extract a concise comma‑separated list (max 10) of technical skills / tools mentioned in this résumé text.',
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
      .filter((s: string) => s.length >= 3)             // ≥ 3 chars
      .filter((s: string) => s.split(/\s+/).length <= 3); // ≤ 3 words

    /* ---------- 2‑c. merge & dedupe ---------- */
    const skills = Array.from(new Set([...kwSkills, ...aiSkills]));

    if (skills.length === 0) {
      return res
        .status(400)
        .json({ error: 'No recognizable skills found in résumé text.' });
    }

/* ---------- 3. Embed résumé & run Redis K‑NN (with cache) ---------- */
const r = await redisConn();                      // reuse for later job fetches
let resumeVec: number[];                   // will hold the 1536‑dim vector

// 3‑a.  Look for an existing vector
const cachedVec = await r.json.get(cacheKey, { path: '.embedding' }) as number[] | null;

if (cachedVec && Array.isArray(cachedVec)) {
  console.log('[resume] cache hit for', cacheKey);
  resumeVec = cachedVec;                         // ✅  use cached vector
} else {
  console.log('[resume] cache miss – embedding résumé');
  // 3‑b.  Generate the vector with OpenAI
  const embedResp = await openai.embeddings.create({
    model: EMBED_MODEL,
    input: inputText,
  });
  resumeVec = embedResp.data[0].embedding;

  // 3‑c.  Store in Redis and set TTL (24 h here – tweak as you wish)
  await r.json.set(cacheKey, '.', { embedding: resumeVec });
  await r.expire(cacheKey, 60 * 60 * 24);         // 86 400 s = 24 h
}

/* ---------- 4. Nearest‑neighbour search (unchanged) ---------- */
const hits = await knnSearch(resumeVec, 20);        
                if (hits.length === 0) {
                  return res.json({
                    skills,
                    recommendations: [],
                    truncated: rawResume.length !== inputText.length,
                    vectorEmbeddedTokens: tokens,
                  });
                }      // [{ id, score }]
    
        // Fetch the neighbour docs (re‑use `lean()` helper from recommend.ts if you like)
        const pipe  = r.multi();
        hits.forEach(h => {
            const key =
              typeof h.id === 'string' && h.id.startsWith('job:')
                ? h.id               // already OK
                : `job:${h.id}`;     // add prefix for numeric IDs
            pipe.json.get(key, { path: '.' });
          });
        const raw   = (await pipe.exec()) as unknown[];
    
        const jobs  = raw
          .map((entry, i) => Array.isArray(entry) ? entry[1] : entry)
          .map((doc, i) => {
            if (!doc) return null;
            const { embedding, ...rest } = doc;   // ✂️ drop vector
            return { ...rest, score: hits[i].score };
        })
          .filter(Boolean);
          const recommendations = jobs
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))  // high‑score first
          .slice(0, 10);                                    // top‑N (change 10 → 5 if you like)

    const truncated = rawResume.length !== inputText.length;
    return res.json({
            skills,                  // still useful for UI
            recommendations,   // vector hits from Redis
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
  const { resumeText } = req.body as { resumeText?: any };
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
