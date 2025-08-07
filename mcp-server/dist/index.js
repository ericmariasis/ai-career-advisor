"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const search_1 = __importDefault(require("./routes/search"));
const favorites_1 = __importDefault(require("./routes/favorites"));
const resume_1 = __importDefault(require("./routes/resume"));
const recommend_1 = __importDefault(require("./routes/recommend"));
const jobs_1 = __importDefault(require("./routes/jobs"));
const sse_favorites_1 = __importDefault(require("./routes/sse-favorites"));
const favorites_total_1 = __importDefault(require("./routes/favorites-total"));
const favorites_trend_1 = __importDefault(require("./routes/favorites-trend"));
const pubsub_1 = require("./lib/pubsub");
const createCacheIndex_1 = require("./lib/createCacheIndex");
const rateLimiter_1 = require("./middleware/rateLimiter");
const requestValidation_1 = require("./middleware/requestValidation");
const usageMonitor_1 = require("./middleware/usageMonitor");
const redis_1 = __importDefault(require("./lib/redis"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// Apply general rate limiting to all API routes
app.use('/api', rateLimiter_1.generalApiLimiter);
app.use(express_1.default.json({ limit: '10mb' })); // plenty for a 7 000‑token résumé
app.use(express_1.default.text({ limit: '10mb', type: 'text/plain' }));
// (optional) if you also accept url‑encoded forms anywhere:
// app.use(express.urlencoded({ extended: true, limit: '1mb' }));
/* ------------------------------------------------------------- */
/*  Search API (GET /api/search?... )                            */
/* ------------------------------------------------------------- */
app.use('/api/search', rateLimiter_1.searchLimiter, requestValidation_1.validateSearchRequest, search_1.default);
/* ---------------- Favorites -------------- */
app.use('/api/favorites', favorites_1.default); // ← NEW
/* ---------------- Resume -------------- */
app.use('/api/resume', resume_1.default); // ← NEW
/* ---------------- Recommend -------------- */
app.use('/api/recommend', recommend_1.default);
/* ---------------- Jobs -------------- */
app.use('/api/jobs', jobs_1.default);
/* ---------------- SSE Events -------------- */
app.use('/api/events', sse_favorites_1.default);
app.use('/api/favorites-total', favorites_total_1.default);
app.use('/api/favorites-trend', favorites_trend_1.default);
/* ---------------- Usage Monitoring -------------- */
app.get('/api/admin/usage', async (req, res) => {
    try {
        const stats = await usageMonitor_1.usageMonitor.getUsageStats(7); // Last 7 days
        res.json({
            message: 'Usage statistics for last 7 days',
            stats: stats,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Failed to get usage stats:', error);
        res.status(500).json({ error: 'Failed to get usage stats' });
    }
});
/* ---------------- Health Check -------------- */
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
/* ------------------------------------------------------------- */
/*  Start the server                                             */
/* ------------------------------------------------------------- */
const PORT = process.env.PORT || 4000;
// Graceful shutdown handling
async function gracefulShutdown(signal) {
    console.log(`🛑 Received ${signal}, shutting down gracefully...`);
    try {
        // Close main Redis client
        try {
            await redis_1.default.quit();
            console.log('🔌 Main Redis connection closed');
        }
        catch (err) {
            console.log('⚠️  Main Redis client already closed or not available');
        }
        // Close pub/sub clients
        try {
            const pubClient = await (0, pubsub_1.getPubClient)();
            if (pubClient) {
                await pubClient.quit();
                console.log('🔌 Redis publisher closed');
            }
        }
        catch (err) {
            console.log('⚠️  Redis publisher already closed or not available');
        }
        try {
            const subClient = await (0, pubsub_1.getSubClient)();
            if (subClient) {
                await subClient.quit();
                console.log('🔌 Redis subscriber closed');
            }
        }
        catch (err) {
            console.log('⚠️  Redis subscriber already closed or not available');
        }
        console.log('✅ Graceful shutdown completed');
    }
    catch (error) {
        console.error('❌ Error during graceful shutdown:', error);
    }
    process.exit(0);
}
// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
(async () => {
    try {
        await (0, pubsub_1.initializePubSub)();
        await (0, createCacheIndex_1.ensureCacheIndex)();
        console.log('✅ PubSub initialized');
        console.log('✅ Cache index ensured');
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`🛡️  Security middleware active`);
            console.log(`📊 Usage monitoring available at /api/admin/usage`);
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
})();
