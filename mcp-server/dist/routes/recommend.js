"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/recommend.ts
const express_1 = require("express");
const redisSearch_1 = require("../lib/redisSearch");
const router = (0, express_1.Router)();
/** Pick whichever distance field is present and coerce to a number */
const dist = (h) => { var _a, _b, _c, _d; return (_d = (_c = (_b = (_a = h.vectorDistance) !== null && _a !== void 0 ? _a : h.distance) !== null && _b !== void 0 ? _b : h.__dist) !== null && _c !== void 0 ? _c : h.score) !== null && _d !== void 0 ? _d : 0; };
const asSimilarity = (d) => d === null ? null : 1 / (1 + d); // 0 → 1,  0.5 → 0.67, …
/** escape → build one RediSearch TAG filter (NO leading space). */
const tagFilter = (field, value) => {
    const esc = value.replace(/(["\\])/g, '\\$1'); // \" or \\
    return /[,\s]/.test(esc) ? `@${field}:{"${esc}"}` : `@${field}:{${esc}}`;
};
/** drop the heavy vector and tack on the neighbour’s score */
const lean = (doc, score) => {
    if (!doc)
        return null;
    const { embedding, ...rest } = doc;
    return { ...rest, score };
};
// Simple job suggestions endpoint for "no results" fallback
router.get('/suggestions', async (req, res) => {
    console.log('🎯 SUGGESTIONS ROUTE HIT with query:', req.query);
    const { text } = req.query;
    if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ error: 'Missing or empty text parameter' });
    }
    try {
        const r = await (0, redisSearch_1.redisConn)();
        // For now, just return some related jobs based on simple search
        // This is a simplified version that searches for jobs and returns a few
        const searchRes = await r.ft.search('jobsIdx', `${text.trim()}*`, // Simple prefix search
        {
            LIMIT: { from: 0, size: 6 },
            DIALECT: 3,
            RETURN: ['2', '$', 'AS', 'json']
        });
        const total = searchRes.total;
        const documents = searchRes.documents;
        if (total === 0) {
            // If no matches, return some random popular jobs
            const fallbackRes = await r.ft.search('jobsIdx', '*', {
                LIMIT: { from: 0, size: 6 },
                DIALECT: 3,
                RETURN: ['2', '$', 'AS', 'json']
            });
            const fallbackDocs = fallbackRes.documents;
            const suggestions = fallbackDocs.map((doc) => {
                const parsed = JSON.parse(doc.value.json);
                const job = Array.isArray(parsed) ? parsed[0] : parsed; // unwrap `[ {...} ]`
                return {
                    ...job,
                    score: 0.5 // Mock similarity score
                };
            });
            return res.json(suggestions);
        }
        const suggestions = documents.map((doc) => {
            const parsed = JSON.parse(doc.value.json);
            const job = Array.isArray(parsed) ? parsed[0] : parsed; // unwrap `[ {...} ]`
            return {
                ...job,
                score: 0.8 // Mock similarity score for text matches
            };
        });
        res.json(suggestions);
    }
    catch (err) {
        console.error('Suggestions error:', err);
        res.status(500).json({ error: 'Failed to get suggestions' });
    }
});
router.get('/job/:id', async (req, res) => {
    console.log('🔍 ID ROUTE HIT with params:', req.params);
    const r = await (0, redisSearch_1.redisConn)();
    const jobKey = `job:${req.params.id}`;
    /* 1️⃣ fetch the source job */
    const job = (await r.json.get(jobKey, { path: '.' }));
    if (!job) {
        return res.status(404).json({ error: 'job not found' });
    }
    if (!Array.isArray(job.embedding) || !job.embedding.length) {
        // no vector yet – let the UI show the job details but no recs
        return res.json({ objectID: job.objectID, recommendations: [] });
    }
    /* 2️⃣ nearest‑neighbour search (k = 6 so we can drop self) */
    const hits = (await (0, redisSearch_1.knnSearch)(job.embedding, 6));
    console.log('► knn hits', hits.map(h => h.id));
    /* 3️⃣ normalise ids, drop self, add numeric score, cap at 5 */
    const normalise = (raw) => raw.toString().startsWith('job:') ? raw.toString() : `job:${raw}`;
    const selfId = normalise(req.params.id); // "job:99991"
    const neighbours = hits
        .map(h => {
        var _a, _b, _c, _d;
        const dist = (_d = (_c = (_b = (_a = h.score) !== null && _a !== void 0 ? _a : h.vectorDistance) !== null && _b !== void 0 ? _b : h.distance) !== null && _c !== void 0 ? _c : h.__dist) !== null && _d !== void 0 ? _d : null;
        return {
            id: normalise(h.id),
            score: asSimilarity(dist) // 1 = identical, →0 = far
        };
    })
        .filter(n => n.id !== selfId)
        .slice(0, 5);
    if (!neighbours.length) {
        return res.json({ objectID: job.objectID, recommendations: [] });
    }
    /* 4️⃣ batch‑fetch neighbour docs, strip vector, attach score */
    const pipe = r.multi();
    neighbours.forEach(n => pipe.json.get(n.id, { path: '.' }));
    const raw = (await pipe.exec()); // [[doc|null], …]
    const recommendations = raw
        .map((entry, idx) => (Array.isArray(entry) ? entry[1] : entry)) // unwrap
        .map((doc, idx) => { var _a; return lean(doc, (_a = neighbours[idx].score) !== null && _a !== void 0 ? _a : 0); })
        .filter(Boolean); // drop nulls
    res.json({ objectID: job.objectID, recommendations });
});
exports.default = router;
