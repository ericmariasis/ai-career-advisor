import express from 'express';
import dotenv  from 'dotenv';
import searchRouter from './routes/search';
import { jobsIndex } from './algolia'; // still used by /recommend

dotenv.config();

const app = express();
app.use(express.json());

/* ------------------------------------------------------------- */
/*  Search API (GET /api/search?... )                            */
/* ------------------------------------------------------------- */
app.use('/api/search', searchRouter);

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
app.listen(PORT, () =>
  console.log(`✅  MCP server running on http://localhost:${PORT}`),
);
