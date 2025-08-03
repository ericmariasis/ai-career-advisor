"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const insightsServer_1 = __importDefault(require("../insightsServer"));
const store_1 = require("../lib/store");
const redisSearch_1 = require("../lib/redisSearch"); // ← add loadDB
const pubsub_1 = require("../lib/pubsub");
const router = (0, express_1.Router)();
/** POST /api/favorites
 *  body: { objectID, queryID, position, userToken, save?: boolean }
 *  save defaults to true (= mark as favourite)
 */
router.post('/', async (req, res) => {
    try {
        const { objectID, userToken, save = true } = req.body;
        // queryID & position are optional﻿
        const { queryID = undefined, position = 0 } = req.body;
        if (!objectID || !userToken) {
            return res.status(400).json({ error: 'objectID and userToken are required' });
        }
        /* 1️⃣  persist ------------------------------------------------ */
        const total = await (0, store_1.toggleFavorite)(userToken, objectID, save);
        // Broadcast real-time update
        await (0, pubsub_1.broadcastFavorite)(save ? 1 : -1, userToken, objectID);
        /* 2️⃣  send Insights event ------------------------------------ */
        if (save) {
            // ► user clicked  ⭐  — we record it as a conversion *after* a search
            insightsServer_1.default('convertedObjectIDsAfterSearch', {
                index: 'jobs',
                eventName: 'Job saved',
                queryID, // ✅ allowed here
                objectIDs: [objectID],
                userToken,
                eventSubtype: 'addToCart', // optional, fine to keep
            });
        }
        else {
            // ► user un-starred  — still a conversion, but no longer tied to a search
            insightsServer_1.default('convertedObjectIDs', {
                index: 'jobs',
                eventName: 'Job unsaved',
                objectIDs: [objectID],
                userToken,
                eventSubtype: 'removeFromCart', // optional (or omit)
            });
        }
        /* 3️⃣  (optional) lookup job for snack-bar title -------------- */
        let title;
        try {
            const redis = await (0, redisSearch_1.redisConn)();
            const key = `job:${objectID}`;
            const jobData = await redis.json.get(key, { path: '$.title' });
            if (jobData && Array.isArray(jobData) && jobData[0]) {
                title = String(jobData[0]);
            }
        }
        catch {
            /* ignore lookup errors */
        }
        res.json({ ok: true, total, savedTitle: title });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save favourite' });
    }
});
/** GET /api/favorites?userToken=xyz
 *    → { ids: string[] }
 */
router.get('/', async (req, res) => {
    const { userToken } = req.query;
    if (!userToken) {
        return res
            .status(400)
            .json({ error: 'userToken query‑param required' });
    }
    const ids = await (0, store_1.getFavorites)(userToken);
    return res.json({ ids });
});
/* -------------------------------------------------------------
* GET /api/favorites/details?userToken=...
* → returns the full job objects for the user's saved IDs
* ------------------------------------------------------------*/
router.get('/details', async (req, res) => {
    const { userToken } = req.query;
    if (!userToken) {
        return res.status(400).json({ error: 'userToken query-param required' });
    }
    const ids = await (0, store_1.getFavorites)(userToken);
    if (ids.length === 0)
        return res.json([]);
    try {
        const redis = await (0, redisSearch_1.redisConn)();
        const jobs = [];
        // Fetch each job from Redis using the job:ID pattern
        for (const id of ids) {
            const key = `job:${id}`;
            try {
                const jobData = await redis.json.get(key, { path: '$' });
                if (jobData && Array.isArray(jobData) && jobData[0]) {
                    jobs.push(jobData[0]);
                }
            }
            catch (err) {
                // Skip jobs that can't be found
            }
        }
        res.json(jobs);
    }
    catch (err) {
        console.error('🔥 Backend: Error:', err);
        res.status(500).json({ error: 'Failed to fetch saved jobs' });
    }
});
exports.default = router;
