"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const redis_1 = __importDefault(require("../lib/redis"));
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
        const esc = v.replace(/(["\\])/g, '\\$1'); // escape " and \
        return /[,\s]/.test(esc) ? `"${esc}"` : esc; // quote if needed
    });
    return ` @${field}:{${tokens.join('|')}}`;
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
    const { q = '', page = '0', hitsPerPage = '20', company, location, industry, tag = '', salaryMin = '', salaryMax = '' } = req.query;
    // validate / coerce pagination
    const pageNum = Math.max(Number(page), 0);
    const perPage = Math.min(Math.max(Number(hitsPerPage), 1), 100);
    const offset = pageNum * perPage;
    // 1️⃣  start with the free‑text part (may be empty)
    let redisQuery = q.trim();
    // 2️⃣  append TAG / NUMERIC filters …
    if (company)
        redisQuery += buildTagFilter('company', [company]);
    if (location)
        redisQuery += buildTagFilter('location', [location]);
    if (industry)
        redisQuery += buildTagFilter('industry', [industry]);
    const tagList = tag.split(',').filter(Boolean);
    if (tagList.length)
        redisQuery += buildTagFilter('tags', tagList);
    if (salaryMin || salaryMax) {
        const min = salaryMin || '-inf';
        const max = salaryMax || '+inf';
        redisQuery += ` @salary_estimate:[${min} ${max}]`;
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
            return Array.isArray(parsed) ? parsed[0] : parsed; // unwrap `[ {...} ]`
        });
        // 2️⃣  helper to aggregate facet counts
        // --- helper with raw FT.AGGREGATE (avoids TS typing issues) ---
        // --- helper with raw FT.AGGREGATE (adds DIALECT 3) -----------------
        const facetCounts = async (field) => {
            const raw = await redis_1.default.sendCommand([
                'FT.AGGREGATE', 'jobsIdx', redisQuery,
                'DIALECT', '3', // 👈  NEW
                'GROUPBY', '1', `@${field}`,
                'REDUCE', 'COUNT', '0', 'AS', 'count'
            ]);
            // raw[0] = total groups, then repeating [ "field", value, "count", N ]
            const map = {};
            for (let i = 1; i < raw.length; i++) {
                const arr = raw[i];
                const val = arr[1];
                const count = Number(arr[3]);
                map[val] = count;
            }
            return map;
        };
        const [companyFacet, locationFacet, tagFacet] = await Promise.all([
            facetCounts('company'),
            facetCounts('location'),
            facetCounts('tags')
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
                tags: tagFacet
            }
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Search failed' });
    }
});
exports.default = router;
