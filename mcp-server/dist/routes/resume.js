"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const extractSkills_1 = require("../utils/extractSkills");
const redisSearch_1 = require("../lib/redisSearch");
const openai_1 = require("../openai");
const tokens_1 = require("../lib/tokens");
const semcache_1 = require("../lib/semcache");
const rateLimiter_1 = require("../middleware/rateLimiter");
const requestValidation_1 = require("../middleware/requestValidation");
const usageMonitor_1 = require("../middleware/usageMonitor");
const router = (0, express_1.Router)();
/* ---------- token‑guard constants ---------- */
const TOKEN_LIMIT = 7000; // soft cap (hard = 8 192)
const TRUNC_TARGET = 6500; // what we aim for after trimming
/**  POST /api/resume  { resumeText: string } */
router.post('/', rateLimiter_1.aiEndpointLimiter, requestValidation_1.validateResumeRequest, usageMonitor_1.checkUsageLimits, async (req, res) => {
    var _a;
    try {
        const { resumeText } = req.body;
        if (resumeText === undefined || resumeText === null) {
            return res.status(400).json({ error: 'resumeText required' });
        }
        /* ---------- 1. token guard ---------- */
        // ☑️ Always work with a bona‑fide string
        /* ----------------------------------------------------------
           PowerShell's  ConvertTo‑Json  wraps long strings like so:
             { resumeText: { value: "<real‑text>", Count: 123456 } }
           Detect that case and unwrap the  .value  property.          */
        const rawResume = (() => {
            if (typeof resumeText === 'string')
                return resumeText; // normal case
            if (Buffer.isBuffer(resumeText))
                return resumeText.toString();
            // PowerShell wrapper: { value: "<string>", Count: n }
            if (resumeText && typeof resumeText === 'object' && 'value' in resumeText) {
                const v = resumeText.value;
                if (typeof v === 'string')
                    return v;
            }
            // Fallback – stringify whatever it is (keeps old behaviour)
            return String(resumeText);
        })();
        console.log('[resume] received chars:', rawResume.length);
        /* ---------- 1. token guard ---------- */
        let tokens = await (0, tokens_1.countTokens)(rawResume);
        let inputText = rawResume;
        if (tokens > TOKEN_LIMIT) {
            const ratio = TRUNC_TARGET / tokens; // ≈ 0‑1
            const cut = Math.floor(rawResume.length * ratio);
            inputText = rawResume.slice(0, cut);
            tokens = await (0, tokens_1.countTokens)(inputText);
            console.warn(`[resume] truncated from ${rawResume.length} → ${inputText.length} chars (${tokens} tokens)`);
        }
        /* ---------- 2‑a. regex skills ---------- */
        const kwSkills = (0, extractSkills_1.extractSkills)(rawResume);
        /* ---------- 2‑b. LLM‑enriched skills (semantic cache) ---------- */
        const sePrompt = '[SkillExtract] ' + rawResume;
        const seHit = await (0, semcache_1.getCachedAnswer)('skill_extract', sePrompt);
        let aiSkillsRaw;
        if (seHit) {
            console.log(`[cache] skill_extract hit (sim=${seHit.similarity.toFixed(2)})`);
            aiSkillsRaw = seHit.answer;
        }
        else {
            const aiResp = await openai_1.openai.chat.completions.create({
                model: openai_1.OPENAI_MODEL,
                temperature: 0,
                max_tokens: 60,
                messages: [
                    {
                        role: 'system',
                        content: 'Extract a concise comma‑separated list (max 10) of technical skills / tools mentioned in this résumé text.',
                    },
                    { role: 'user', content: rawResume.slice(0, 4000) },
                ],
            });
            aiSkillsRaw = (_a = aiResp.choices[0].message.content) !== null && _a !== void 0 ? _a : '';
            await (0, semcache_1.putCachedAnswer)('skill_extract', sePrompt, aiSkillsRaw);
            // Track API usage for monitoring and cost control
            const inputTokens = await (0, tokens_1.countTokens)(rawResume.slice(0, 4000));
            const outputTokens = await (0, tokens_1.countTokens)(aiSkillsRaw);
            await usageMonitor_1.usageMonitor.trackUsage(req, openai_1.OPENAI_MODEL, inputTokens, outputTokens);
        }
        const aiSkills = aiSkillsRaw
            .split(/[,;\n]/)
            .map((s) => s.trim().toLowerCase())
            .filter((s) => !!s) // non‑empty
            .filter((s) => s.length >= 3) // ≥ 3 chars
            .filter((s) => s.split(/\s+/).length <= 3); // ≤ 3 words
        /* ---------- 2‑c. merge & dedupe ---------- */
        const skills = Array.from(new Set([...kwSkills, ...aiSkills]));
        if (skills.length === 0) {
            return res
                .status(400)
                .json({ error: 'No recognizable skills found in résumé text.' });
        }
        /* ---------- 3. Skills-based job search ---------- */
        const r = await (0, redisSearch_1.redisConn)();
        // Use skills to find matching jobs via Redis search
        const skillsQuery = skills.map(skill => `@skills:{${skill.replace(/[^a-zA-Z0-9\s]/g, '')}}`).join(' | ');
        console.log('[resume] skills query:', skillsQuery);
        let searchResults;
        try {
            searchResults = await r.ft.search('jobsIdx', skillsQuery || '*', // fallback to all jobs if no skills
            {
                LIMIT: { from: 0, size: 20 },
                DIALECT: 3,
                RETURN: ['2', '$', 'AS', 'json']
            });
        }
        catch (searchErr) {
            console.error('[resume] Search error:', searchErr);
            // Fallback to basic search
            searchResults = await r.ft.search('jobsIdx', '*', {
                LIMIT: { from: 0, size: 20 },
                DIALECT: 3,
                RETURN: ['2', '$', 'AS', 'json']
            });
        }
        const total = searchResults.total;
        const documents = searchResults.documents;
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
            const overlap = skills.filter(skill => jobSkills.some((jobSkill) => jobSkill.toLowerCase().includes(skill.toLowerCase()) ||
                skill.toLowerCase().includes(jobSkill.toLowerCase()))).length;
            const score = overlap / Math.max(skills.length, 1); // normalize by number of skills
            return {
                ...jobData,
                score: Math.round(score * 100) / 100 // round to 2 decimal places
            };
        });
        const recommendations = jobs
            .sort((a, b) => { var _a, _b; return ((_a = b.score) !== null && _a !== void 0 ? _a : 0) - ((_b = a.score) !== null && _b !== void 0 ? _b : 0); }) // high-score first
            .slice(0, 10); // top-10
        const truncated = rawResume.length !== inputText.length;
        return res.json({
            skills, // still useful for UI
            recommendations, // skills-based matches from Redis
            truncated,
            vectorEmbeddedTokens: tokens,
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'resume match failed' });
    }
});
/* ---------- coaching feedback ---------- */
router.post('/feedback', rateLimiter_1.feedbackLimiter, requestValidation_1.validateResumeRequest, usageMonitor_1.checkUsageLimits, async (req, res) => {
    var _a, _b;
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
        const fbPrompt = '[TechSkillFeedback] ' + resumeText;
        const fbHit = await (0, semcache_1.getCachedAnswer)('tech_skill_extract', fbPrompt);
        let feedback;
        if (fbHit) {
            console.log(`[cache] tech_skill_extract hit (sim=${fbHit.similarity.toFixed(2)})`);
            feedback = fbHit.answer.trim();
        }
        else {
            const completion = await openai_1.openai.chat.completions.create({
                model: openai_1.OPENAI_MODEL,
                temperature: 0,
                max_tokens: 300,
                messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: user },
                ],
            });
            feedback = ((_b = (_a = completion.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) === null || _b === void 0 ? void 0 : _b.trim()) || '';
            await (0, semcache_1.putCachedAnswer)('tech_skill_extract', fbPrompt, feedback);
            // Track API usage for monitoring and cost control
            const inputTokens = await (0, tokens_1.countTokens)(user);
            const outputTokens = await (0, tokens_1.countTokens)(feedback);
            await usageMonitor_1.usageMonitor.trackUsage(req, openai_1.OPENAI_MODEL, inputTokens, outputTokens);
        }
        return res.json({ feedback });
    }
    catch (err) {
        console.error('Résumé feedback error', err);
        return res.status(500).json({ error: 'Failed to generate résumé feedback' });
    }
});
exports.default = router;
