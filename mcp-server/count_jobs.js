/**
 * count_jobs.js – prints record count for the `jobs` index
 */
require('dotenv').config();                // auto-loads .env in cwd
const algoliasearch = require('algoliasearch');

const client = algoliasearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_ADMIN_KEY
);

client
  .initIndex('jobs')
  .search('', { hitsPerPage: 0 })
  .then(r => console.log(`✅  jobs index has ${r.nbHits} records`))
  .catch(console.error);
