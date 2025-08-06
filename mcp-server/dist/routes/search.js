"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const redis_1 = __importDefault(require("../lib/redis"));
/**
 * Generate a consistent mock cultural fit score (0-1) based on job characteristics
 * In production, this would come from AI analysis
 */
function generateMockFitScore(jobData) {
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
const router = (0, express_1.Router)();
/** Build a valid RediSearch TAG filter.
 *   - quote a value if it contains space or comma
 *   - escape embedded " or \
 *   - join multiple values with |
 *   - **NO spaces inside the braces**
 *   - keep a leading space so it can be concatenated
 */
const buildTagFilter = (field, values) => {
    if (!values.length)
        return '';
    const tokens = values.map(v => {
        // For TAG fields, escape commas and spaces with backslashes
        return v.replace(/([,\s\\])/g, '\\$1');
    });
    return ` @${field}:{${tokens.join('|')}}`;
};
// Helper function for TEXT field filters (like company)
const buildTextFilter = (field, values) => {
    if (!values.length)
        return '';
    const quotedValues = values.map(v => `"${v.replace(/"/g, '\\"')}"`);
    return ` @${field}:(${quotedValues.join('|')})`;
};
// Helper function to generate AI classifications for demo purposes
const generateAIClassifications = (job) => {
    const title = (job.title || '').toLowerCase();
    const industry = job.industry || '';
    // Generate seniority_ai based on title keywords
    let seniority_ai;
    if (title.includes('intern') || title.includes('trainee')) {
        seniority_ai = 'Intern';
    }
    else if (title.includes('junior') || title.includes('entry') || title.includes('associate') || title.includes('assistant')) {
        seniority_ai = 'Junior';
    }
    else if (title.includes('senior') || title.includes('sr.') || title.includes('sr ')) {
        seniority_ai = 'Senior';
    }
    else if (title.includes('lead') || title.includes('manager') || title.includes('director') || title.includes('head') || title.includes('chief') || title.includes('vp')) {
        seniority_ai = 'Lead';
    }
    else if (title.includes('developer') || title.includes('analyst') || title.includes('specialist') || title.includes('engineer')) {
        seniority_ai = 'Mid';
    }
    // Generate industry_ai based on existing industry field
    let industry_ai;
    const industryLower = industry.toLowerCase();
    if (industryLower.includes('financial') || industryLower.includes('insurance')) {
        industry_ai = 'FinTech';
    }
    else if (industryLower.includes('health')) {
        industry_ai = 'HealthTech';
    }
    else if (industryLower.includes('education')) {
        industry_ai = 'EdTech';
    }
    else if (industryLower.includes('software') || industryLower.includes('telecommunications')) {
        industry_ai = 'SaaS';
    }
    else if (industryLower.includes('retail') || industryLower.includes('consumer')) {
        industry_ai = 'E-commerce';
    }
    else if (industryLower.includes('media')) {
        industry_ai = 'Gaming';
    }
    else if (industryLower.includes('artificial intelligence')) {
        industry_ai = 'AI/ML';
    }
    else if (industryLower.includes('security')) {
        industry_ai = 'Cybersecurity';
    }
    else if (industryLower.includes('hardware') || industryLower.includes('engineering')) {
        industry_ai = 'IoT';
    }
    return { seniority_ai, industry_ai };
};
// ─────────────────────────────────────────────────────────
// GET /api/search/job/:id   → fetch one job document
// ─────────────────────────────────────────────────────────
router.get('/job/:id', async (req, res) => {
    const { id } = req.params;
    if (!id)
        return res.status(400).json({ error: 'Missing job id' });
    try {
        // returns `[ { … } ]`   →   cast then pick the first entry
        const raw = await redis_1.default.json.get(`job:${id}`, { path: '$' });
        const job = raw === null || raw === void 0 ? void 0 : raw[0]; // 👈 unwrap
        if (!job)
            return res.status(404).json({ error: 'Job not found' });
        res.json(job);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch job' });
    }
});
// ─────────────────────────────────────────────────────────
// GET /api/search           → full‑text + facet search
// ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    // query‑string params
    const { q = '', page = '0', hitsPerPage = '20', company, location, industry, tag = '', salaryMin = '', salaryMax = '', facetFilters = '', seniority_ai = '', industry_ai = '' } = req.query;
    // Debug logging
    console.log('🚀 SEARCH REQUEST:', new Date().toISOString());
    console.log('🔥 Query params:', { q, facetFilters, location, industry, company });
    // validate / coerce pagination
    const pageNum = Math.max(Number(page), 0);
    const perPage = Math.min(Math.max(Number(hitsPerPage), 1), 100);
    const offset = pageNum * perPage;
    // 1️⃣  start with the free‑text part (may be empty)
    let redisQuery = q.trim();
    // 🔧 NEW: if query might be a skill, add skills search
    if (redisQuery && redisQuery.length > 2) {
        // Create a combined query: text search OR skills tag search
        redisQuery = `(${redisQuery} | @skills:{${redisQuery}})`;
    }
    // 2️⃣  append TAG / NUMERIC filters …
    if (company)
        redisQuery += buildTagFilter('company', [company]);
    if (location)
        redisQuery += buildTagFilter('location', [location]);
    if (industry)
        redisQuery += buildTagFilter('industry', [industry]);
    // Handle facetFilters parameter (array format: ["location:Seattle, WA", "industry:Tech"])
    if (facetFilters) {
        try {
            // Handle both array (from axios) and string (from curl) formats
            let filters;
            if (Array.isArray(facetFilters)) {
                filters = facetFilters;
            }
            else if (typeof facetFilters === 'string') {
                filters = JSON.parse(facetFilters);
            }
            else {
                filters = [];
            }
            const locationFilters = [];
            const industryFilters = [];
            const companyFilters = [];
            const skillsFilters = [];
            filters.forEach(filter => {
                if (filter.startsWith('location:')) {
                    locationFilters.push(filter.substring(9)); // Remove "location:" prefix
                }
                else if (filter.startsWith('industry:')) {
                    industryFilters.push(filter.substring(9)); // Remove "industry:" prefix
                }
                else if (filter.startsWith('company:')) {
                    companyFilters.push(filter.substring(8)); // Remove "company:" prefix
                }
                else if (filter.startsWith('skills:')) {
                    skillsFilters.push(filter.substring(7)); // Remove "skills:" prefix
                }
            });
            if (locationFilters.length)
                redisQuery += buildTagFilter('location', locationFilters);
            if (industryFilters.length)
                redisQuery += buildTagFilter('industry', industryFilters);
            if (companyFilters.length)
                redisQuery += buildTextFilter('company', companyFilters);
            if (skillsFilters.length)
                redisQuery += buildTagFilter('skills', skillsFilters);
        }
        catch (e) {
            console.warn('Failed to parse facetFilters:', facetFilters, e);
        }
    }
    const tagList = tag.split(',').filter(Boolean);
    if (tagList.length)
        redisQuery += buildTagFilter('tags', tagList);
    if (salaryMin || salaryMax) {
        const min = salaryMin || '-inf';
        const max = salaryMax || '+inf';
        redisQuery += ` @salary_estimate:[${min} ${max}]`;
    }
    // AI-based filtering (generate classifications on-the-fly for demo)
    if (seniority_ai) {
        // Filter by job title keywords that suggest seniority level
        const seniorityKeywords = {
            'Intern': ['intern', 'internship', 'trainee'],
            'Junior': ['junior', 'entry', 'associate', 'assistant'],
            'Mid': ['developer', 'analyst', 'specialist', 'engineer'],
            'Senior': ['senior', 'lead', 'principal', 'staff'],
            'Lead': ['lead', 'manager', 'director', 'head', 'chief', 'vp', 'vice president']
        };
        const keywords = seniorityKeywords[seniority_ai];
        if (keywords) {
            const titleFilters = keywords.map(kw => `*${kw}*`).join('|');
            redisQuery += ` @title:(${titleFilters})`;
        }
    }
    if (industry_ai) {
        // Map AI industry categories to existing industry tags
        const industryMapping = {
            'FinTech': ['financial services', 'insurance'],
            'HealthTech': ['health services', 'health products'],
            'EdTech': ['education'],
            'SaaS': ['software', 'telecommunications'],
            'E-commerce': ['retail', 'consumer services'],
            'Gaming': ['media', 'software'],
            'AI/ML': ['software', 'artificial intelligence'],
            'Blockchain': ['software', 'financial services'],
            'IoT': ['computer hardware', 'engineering'],
            'Cybersecurity': ['security', 'software']
        };
        const mappedIndustries = industryMapping[industry_ai];
        if (mappedIndustries) {
            const industryFilters = mappedIndustries.map(ind => ind.replace(/([,\s\\])/g, '\\$1')).join('|');
            redisQuery += ` @industry:{${industryFilters}}`;
        }
    }
    // 3️⃣  if everything is still empty, fall back to "*"
    if (!redisQuery.trim())
        redisQuery = '*';
    try {
        // 1️⃣  FT.SEARCH for hits
        const searchRes = await redis_1.default.ft.search('jobsIdx', redisQuery, {
            LIMIT: { from: offset, size: perPage },
            DIALECT: 3,
            // 👇 RETURN 1 $  AS json
            RETURN: ['2', '$', 'AS', 'json']
        });
        console.dir(searchRes, { depth: 4 });
        // node‑redis v4 returns { total, documents }
        const total = searchRes.total;
        const documents = searchRes.documents;
        const docs = searchRes.documents;
        const hits = docs.map(d => {
            const parsed = JSON.parse(d.value.json);
            const jobData = Array.isArray(parsed) ? parsed[0] : parsed; // unwrap `[ {...} ]`
            // Generate AI classifications for demo
            const aiClassifications = generateAIClassifications(jobData);
            // Add fit score and AI classifications to search results
            return {
                ...jobData,
                fitScore: jobData.fitScore || generateMockFitScore(jobData),
                ...aiClassifications
            };
        });
        // 2️⃣  helper to aggregate facet counts
        // --- helper with raw FT.AGGREGATE (avoids TS typing issues) ---
        // --- helper with raw FT.AGGREGATE (adds DIALECT 3) -----------------
        const facetCounts = async (field) => {
            console.log(`🔍 Computing facets for field: ${field} with query: ${redisQuery}`);
            try {
                const map = {};
                // For industry only, use the TAGVALS approach that we know works
                if (field === 'industry') {
                    try {
                        const tagValues = await redis_1.default.sendCommand(['FT.TAGVALS', 'jobsIdx', field]);
                        console.log(`🔍 Found ${tagValues.length} ${field} tags`);
                        for (const tagValue of tagValues.slice(0, 50)) {
                            try {
                                const countQuery = redisQuery === '*' ? `@${field}:{${tagValue}}` : `(${redisQuery}) @${field}:{${tagValue}}`;
                                const result = await redis_1.default.ft.search('jobsIdx', countQuery, { LIMIT: { from: 0, size: 0 } });
                                const count = result.total;
                                if (count > 0) {
                                    map[tagValue] = count;
                                }
                            }
                            catch (err) {
                                console.log(`⚠️ Skipping ${field} tag: ${tagValue}`);
                            }
                        }
                        console.log(`🔍 Final facet map for ${field}:`, Object.keys(map).length, 'entries');
                        if (Object.keys(map).length > 0) {
                            console.log(`🔍 Sample entries:`, Object.entries(map).slice(0, 3));
                        }
                        return map;
                    }
                    catch (err) {
                        console.log(`⚠️ TAGVALS failed for industry: ${err instanceof Error ? err.message : err}`);
                    }
                }
                // For all other fields (location, company, skills), use aggregate approach
                try {
                    const searchResult = await redis_1.default.ft.search('jobsIdx', redisQuery, {
                        LIMIT: { from: 0, size: 0 }
                    });
                    const totalHits = searchResult.total;
                    if (totalHits === 0) {
                        console.log(`⚠️ No hits for query: ${redisQuery}`);
                        return {};
                    }
                    // Get top values for this field using a different approach
                    // Search for the field and count unique values
                    const fieldSearchResult = await redis_1.default.ft.search('jobsIdx', redisQuery, {
                        LIMIT: { from: 0, size: Math.min(1000, totalHits) },
                        RETURN: ['1', field]
                    });
                    const docs = fieldSearchResult.documents;
                    // Count occurrences of each field value
                    const valueCounts = {};
                    for (const doc of docs) {
                        const fieldValue = doc.value[field];
                        if (fieldValue && fieldValue.trim()) {
                            valueCounts[fieldValue] = (valueCounts[fieldValue] || 0) + 1;
                        }
                    }
                    // Return top 50 values by count
                    const sortedValues = Object.entries(valueCounts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 50)
                        .reduce((acc, [key, count]) => {
                        acc[key] = count;
                        return acc;
                    }, {});
                    console.log(`🔍 Final facet map for ${field}:`, Object.keys(sortedValues).length, 'entries');
                    if (Object.keys(sortedValues).length > 0) {
                        console.log(`🔍 Sample entries:`, Object.entries(sortedValues).slice(0, 3));
                    }
                    return sortedValues;
                }
                catch (err) {
                    console.log(`⚠️ Search-based faceting failed for ${field}: ${err instanceof Error ? err.message : err}`);
                    return {};
                }
            }
            catch (error) {
                console.error(`❌ Facet aggregation failed for ${field}:`, error);
                return {};
            }
        };
        const [companyFacet, locationFacet, industryFacet, skillsFacet] = await Promise.all([
            facetCounts('company'),
            facetCounts('location'),
            facetCounts('industry'),
            facetCounts('skills')
        ]);
        res.json({
            query: q,
            nbHits: total,
            page: pageNum,
            nbPages: Math.ceil(total / perPage),
            hits,
            facets: {
                company: companyFacet,
                location: locationFacet,
                industry: industryFacet,
                skills: skillsFacet
            }
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Search failed' });
    }
});
exports.default = router;
