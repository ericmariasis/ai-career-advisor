"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const search_1 = __importDefault(require("./routes/search"));
const favorites_1 = __importDefault(require("./routes/favorites"));
const resume_1 = __importDefault(require("./routes/resume"));
const recommend_1 = __importDefault(require("./routes/recommend"));
const jobs_1 = __importDefault(require("./routes/jobs"));
const sse_favorites_1 = __importDefault(require("./routes/sse-favorites"));
const favorites_total_1 = __importDefault(require("./routes/favorites-total"));
const favorites_trend_1 = __importDefault(require("./routes/favorites-trend"));
const algolia_1 = require("./lib/algolia"); // still used by /recommend
const createCacheIndex_1 = require("./lib/createCacheIndex");
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: '10mb' })); // plenty for a 7 000‑token résumé
app.use(express_1.default.text({ limit: '10mb', type: 'text/plain' }));
// (optional) if you also accept url‑encoded forms anywhere:
// app.use(express.urlencoded({ extended: true, limit: '1mb' }));
/* ------------------------------------------------------------- */
/*  Search API (GET /api/search?... )                            */
/* ------------------------------------------------------------- */
app.use('/api/search', search_1.default);
/* ---------------- Favorites -------------- */
app.use('/api/favorites', favorites_1.default); // ← NEW
/* ---------------- Resume -------------- */
app.use('/api/resume', resume_1.default); // ← NEW
app.use('/api/recommend', recommend_1.default);
/* ---------------- Jobs -------------- */
app.use('/api/jobs', jobs_1.default);
/* ---------------- Real-time Events -------------- */
app.use('/api/events', sse_favorites_1.default);
/* ---------------- Favorites Total -------------- */
app.use('/api/favorites-stats', favorites_total_1.default);
/* ---------------- Favorites Trend -------------- */
app.use('/api/favorites-trend', favorites_trend_1.default);
app.post('/api/recommend/top5', async (_req, res) => {
    const { hits } = await algolia_1.jobsIndex.search('', { hitsPerPage: 5 });
    res.json(hits);
});
/* ------------------------------------------------------------- */
/*  Health check endpoint                                        */
/* ------------------------------------------------------------- */
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
/* ------------------------------------------------------------- */
/*  Boot server                                                  */
/* ------------------------------------------------------------- */
const PORT = process.env.PORT || 4000;
exports.default = app;
// Initialize cache index before starting server
(0, createCacheIndex_1.ensureCacheIndex)().then(async () => {
    // Seed initial favorites data
    const { seedFavoritesData } = await import('./lib/seedFavorites.js');
    await seedFavoritesData();
    app.listen(PORT, () => console.log(`✅  MCP server running on http://localhost:${PORT}`));
}).catch(err => {
    console.error('Failed to initialize cache index:', err);
    process.exit(1);
});
