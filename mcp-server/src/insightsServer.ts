// src/insightsServer.ts
import aa from 'search-insights';
import dotenv from 'dotenv';
dotenv.config();                   // so .env is loaded

// initialise once per Node process
aa('init', {
  appId:  process.env.ALGOLIA_APP_ID,
  apiKey: process.env.ALGOLIA_SEARCH_KEY,   // **search‑only** key is OK
  region: 'us',                             // or 'eu' if your index is there
});

export default aa;
