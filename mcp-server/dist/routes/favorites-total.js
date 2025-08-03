"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const redisSearch_1 = require("../lib/redisSearch");
const router = (0, express_1.Router)();
// Get total count of all favorites across all users
router.get('/total', async (req, res) => {
    try {
        const redis = await (0, redisSearch_1.redisConn)();
        // Get all user hashes that store favorites (pattern: favorites:*)
        const userKeys = await redis.keys('favorites:*');
        let totalFavorites = 0;
        // Count favorites for each user
        for (const userKey of userKeys) {
            const userFavorites = await redis.hLen(userKey);
            totalFavorites += userFavorites;
        }
        res.json({ total: totalFavorites });
    }
    catch (error) {
        console.error('Error getting favorites total:', error);
        res.status(500).json({ error: 'Failed to get favorites count' });
    }
});
exports.default = router;
