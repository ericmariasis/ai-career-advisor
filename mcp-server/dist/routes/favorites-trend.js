"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const redisSearch_1 = require("../lib/redisSearch");
const router = (0, express_1.Router)();
// Get trending favorites data for the last 60 minutes
router.get('/trend', async (req, res) => {
    var _a;
    try {
        const redis = await (0, redisSearch_1.redisConn)();
        const since = Date.now() - 60 * 60000; // 60 minutes ago
        // Get all entries from the favorites_activity stream since the time threshold
        const entries = await redis.xRange('favorites_activity', String(since), '+');
        // Build minute buckets to aggregate activity
        const buckets = {};
        // Handle Redis stream entries - they come as an array of objects with id and message
        for (const entry of entries) {
            const id = entry.id;
            const message = entry.message;
            const ts = Number(id.split('-')[0]);
            const minute = Math.floor(ts / 60000);
            const activity = Number(message.act || 0);
            buckets[minute] = (buckets[minute] || 0) + activity;
        }
        // Create a complete timeline with holes filled (60 minutes worth)
        const out = [];
        for (let i = 59; i >= 0; i--) {
            const timestampMs = Date.now() - i * 60000;
            const minute = Math.floor(timestampMs / 60000);
            out.push([minute * 60000, (_a = buckets[minute]) !== null && _a !== void 0 ? _a : 0]);
        }
        console.log(`📈 Favorites trend: ${entries.length} stream entries, ${out.length} minute buckets`);
        res.json(out); // [[<unixMs>, count], ...]
    }
    catch (error) {
        console.error('Error getting favorites trend:', error);
        res.status(500).json({ error: 'Failed to get favorites trend' });
    }
});
exports.default = router;
