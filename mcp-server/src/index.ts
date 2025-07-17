import express from 'express';
import dotenv  from 'dotenv';
import searchRouter from './routes/search';
import favoritesRouter  from './routes/favorites';
import resumeRouter from './routes/resume';
import recommendRouter from './routes/recommend';
import { jobsIndex } from './lib/algolia'; // still used by /recommend

dotenv.config();

const app = express();
app.use(express.json());

/* ------------------------------------------------------------- */
/*  Search API (GET /api/search?... )                            */
/* ------------------------------------------------------------- */
app.use('/api/search', searchRouter);

/* ---------------- Favorites -------------- */
app.use('/api/favorites',  favoritesRouter);  // ← NEW

/* ---------------- Resume -------------- */
app.use('/api/resume',  resumeRouter);  // ← NEW

app.use('/api/recommend', recommendRouter);

/* ------------------------------------------------------------- */
/*  (Optional) quick “top-5” recommender                         */
/* ------------------------------------------------------------- */
app.post('/recommend', async (_req, res) => {
  const { hits } = await jobsIndex.search('', { hitsPerPage: 5 });
  res.json(hits);
});

/* ------------------------------------------------------------- */
/*  Boot server                                                  */
/* ------------------------------------------------------------- */
const PORT = process.env.PORT || 4000;
export default app;
app.listen(PORT, () =>
  console.log(`✅  MCP server running on http://localhost:${PORT}`),
);
