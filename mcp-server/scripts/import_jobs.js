// scripts/import_jobs.js  (CommonJS version)
const { createClient } = require('redis');
const fs   = require('fs');
const path = require('path');

// ---------- config ----------
const FILE_PATH = path.join(__dirname, '..', 'jobs_seed.json'); // ../jobs_seed.json
const ID_FIELD  = 'objectID';           // unique key in your JSON
const DRY_RUN   = process.argv.includes('--dry-run');
// -----------------------------

(async () => {
  const raw = fs.readFileSync(FILE_PATH, 'utf8');
  const jobs = JSON.parse(raw);
  console.log(`Loaded ${jobs.length} jobs from ${FILE_PATH}`);

  const client = createClient();        // defaults to localhost:6379
  await client.connect();
  console.log('Redis PING →', await client.ping());

  if (DRY_RUN) {
    for (let i = 0; i < Math.min(3, jobs.length); i++) {
      const job = jobs[i];
      console.log(`Would import job:${job[ID_FIELD]}  title="${job.title}"`);
    }
        // exit early so we never connect long enough to write data
        await client.quit();
        process.exit(0);
      }
    
      // ---------- bulk import ----------
      console.time('import');
      const pipeline = client.multi();
      for (const job of jobs) {
        const id  = job[ID_FIELD];          // e.g. 5
        const key = `job:${id}`;
        pipeline.json.set(key, '$', job);
  }
    await pipeline.exec();
  console.timeEnd('import');            // shows total runtime
  console.log(`Imported ${jobs.length} jobs.`);


  await client.quit();
})();
