"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const insightsServer_1 = __importDefault(require("../insightsServer"));
const algolia_1 = require("../lib//algolia");
const store_1 = require("../lib/store"); // ← add loadDB
const router = (0, express_1.Router)();
/** POST /api/favorites
 *  body: { objectID, queryID, position, userToken, save?: boolean }
 *  save defaults to true (= mark as favourite)
 */
router.post('/', async (req, res) => {
    var _a;
    try {
        const { objectID, userToken, save = true } = req.body;
        // queryID & position are optional﻿
        const { queryID = undefined, position = 0 } = req.body;
        if (!objectID || !userToken) {
            return res.status(400).json({ error: 'objectID and userToken are required' });
        }
        /* 1️⃣  persist ------------------------------------------------ */
        const total = await (0, store_1.toggleFavorite)(userToken, objectID, save);
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
            const { results } = await algolia_1.jobsIndex.getObjects([
                objectID,
            ]);
            title = (_a = results[0]) === null || _a === void 0 ? void 0 : _a.title;
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
* → returns the full job objects for the user’s saved IDs
* ------------------------------------------------------------*/
router.get('/details', async (req, res) => {
    const { userToken } = req.query;
    if (!userToken) {
        return res.status(400).json({ error: 'userToken query-param required' });
    }
    const ids = await (0, store_1.getFavorites)(userToken); // LowDB helper you already have
    if (ids.length === 0)
        return res.json([]); // nothing saved
    try {
        // bulk-fetch up to 1000 objects in one round-trip
        const { results } = await algolia_1.jobsIndex.getObjects(ids);
        // Algolia returns null for any missing IDs → filter them out
        res.json(results.filter(Boolean));
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch saved jobs' });
    }
});
exports.default = router;
