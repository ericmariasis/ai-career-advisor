import express from 'express';
import dotenv  from 'dotenv';
import searchRouter from './routes/search';
import favoritesRouter  from './routes/favorites';
import resumeRouter from './routes/resume';
import recommendRouter from './routes/recommend';
import { jobsIndex } from './lib/algolia'; // still used by /recommend
import { ensureCacheIndex } from './lib/createCacheIndex';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));   // plenty for a 7 000‑token résumé
app.use(express.text({ limit: '10mb', type: 'text/plain' }));

// (optional) if you also accept url‑encoded forms anywhere:
// app.use(express.urlencoded({ extended: true, limit: '1mb' }));

/* ------------------------------------------------------------- */
/*  Search API (GET /api/search?... )                            */
/* ------------------------------------------------------------- */
app.use('/api/search', searchRouter);

/* ---------------- Favorites -------------- */
app.use('/api/favorites',  favoritesRouter);  // ← NEW

/* ---------------- Resume -------------- */
app.use('/api/resume',  resumeRouter);  // ← NEW

app.use('/api/recommend', recommendRouter);

app.post('/api/recommend/top5', async (_req, res) => {
  const { hits } = await jobsIndex.search('', { hitsPerPage: 5 });
  res.json(hits);
});

/* ------------------------------------------------------------- */
/*  Boot server                                                  */
/* ------------------------------------------------------------- */
const PORT = process.env.PORT || 4000;
export default app;

// Initialize cache index before starting server
ensureCacheIndex().then(async () => {
  // Seed initial favorites data
  const { seedFavoritesData } = await import('./lib/seedFavorites.js');
  await seedFavoritesData();
  
  app.listen(PORT, () =>
    console.log(`✅  MCP server running on http://localhost:${PORT}`),
  );
}).catch(err => {
  console.error('Failed to initialize cache index:', err);
  process.exit(1);
});
