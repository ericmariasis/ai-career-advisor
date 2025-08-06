import express from 'express';
import dotenv  from 'dotenv';
import searchRouter from './routes/search';
import favoritesRouter  from './routes/favorites';
import resumeRouter from './routes/resume';
import recommendRouter from './routes/recommend';
import jobsRouter from './routes/jobs';
import sseFavoritesRouter from './routes/sse-favorites';
import favoritesTotalRouter from './routes/favorites-total';
import favoritesTrendRouter from './routes/favorites-trend';
import { initializePubSub } from './lib/pubsub';
import { jobsIndex } from './lib/algolia'; // still used by /recommend
import { ensureCacheIndex } from './lib/createCacheIndex';
import { generalApiLimiter, searchLimiter } from './middleware/rateLimiter';
import { validateSearchRequest } from './middleware/requestValidation';
import { usageMonitor } from './middleware/usageMonitor';

dotenv.config();

const app = express();

// Apply general rate limiting to all API routes
app.use('/api', generalApiLimiter);

app.use(express.json({ limit: '10mb' }));   // plenty for a 7 000‑token résumé
app.use(express.text({ limit: '10mb', type: 'text/plain' }));

// (optional) if you also accept url‑encoded forms anywhere:
// app.use(express.urlencoded({ extended: true, limit: '1mb' }));

/* ------------------------------------------------------------- */
/*  Search API (GET /api/search?... )                            */
/* ------------------------------------------------------------- */
app.use('/api/search', searchLimiter, validateSearchRequest, searchRouter);

/* ---------------- Favorites -------------- */
app.use('/api/favorites',  favoritesRouter);  // ← NEW

/* ---------------- Resume -------------- */
app.use('/api/resume',  resumeRouter);  // ← NEW

/* ---------------- Recommend -------------- */
app.use('/api/recommend', recommendRouter);

/* ---------------- Jobs -------------- */
app.use('/api/jobs', jobsRouter);

/* ---------------- SSE Events -------------- */
app.use('/api/events', sseFavoritesRouter);
app.use('/api/favorites-total', favoritesTotalRouter);
app.use('/api/favorites-trend', favoritesTrendRouter);

/* ---------------- Usage Monitoring -------------- */
app.get('/api/admin/usage', async (req, res) => {
  try {
    const stats = await usageMonitor.getUsageStats(7); // Last 7 days
    res.json({
      message: 'Usage statistics for last 7 days',
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
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

(async () => {
  try {
    await initializePubSub();
    await ensureCacheIndex();
    console.log('✅ PubSub initialized');
    console.log('✅ Cache index ensured');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🛡️  Security middleware active`);
      console.log(`📊 Usage monitoring available at /api/admin/usage`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
})();
