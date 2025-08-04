import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from 'redis';

// ── 1. connect ───────────────────────────────────────────────────────────────
const client = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379' });

async function ensureJobsIndex() {
  try {
    await client.connect();
    console.log('🟢 Connected to Redis');

    // ── 2. create index if missing ─────────────────────────────────────────────
    let indices: string[] = [];
    try {
      indices = await client.ft._list() as string[];
    } catch (err) {
      console.log('⚠️  Redis FT._LIST failed, assuming empty index list');
      indices = [];
    }

    if (!indices.includes('jobsIdx')) {
      console.log('🔧 Creating jobsIdx index...');
      // Use the same pattern as createCacheIndex.ts
      await (client as any).ft.create(
        'jobsIdx',
        {
          '$.title': {
            type: 'TEXT',
            AS: 'title',
            sortable: true
          },
          '$.company': {
            type: 'TEXT',
            AS: 'company'
          },
          '$.industry': {
            type: 'TAG',
            AS: 'industry'
          },
          '$.location': {
            type: 'TAG',
            AS: 'location'
          },
          '$.salary_estimate': {
            type: 'NUMERIC',
            AS: 'salary_estimate',
            sortable: true
          },
          '$.skills[*]': {
            type: 'TAG',
            AS: 'skills'
          },
          '$.source': {
            type: 'TAG',
            AS: 'source'
          }
        },
        {
          ON: 'JSON',
          PREFIX: 'job:'
        }
      );
      console.log('✅ jobsIdx created successfully');
    } else {
      console.log('✅ jobsIdx already exists');
    }

    // ── 3. load the seed file once ─────────────────────────────────────────────
    const seedPath = resolve(process.cwd(), 'jobs_seed.json');
    console.log(`📂 Reading seed file: ${seedPath}`);
    
    const raw = readFileSync(seedPath, 'utf8');
    const jobs = JSON.parse(raw);

    if (!Array.isArray(jobs)) {
      throw new Error('Expected jobs_seed.json to contain an array of jobs');
    }

    console.log(`📊 Found ${jobs.length} jobs in seed file`);

    // Check if we already have data to avoid duplicates
    const existingCount = await client.ft.search('jobsIdx', '*', { LIMIT: { from: 0, size: 1 } });
    const total = (existingCount as any).total || 0;

    if (total > 0) {
      console.log(`✅ Index already contains ${total} jobs, skipping seed`);
    } else {
      console.log('🌱 Seeding jobs into Redis...');
      let seeded = 0;
      
      for (const job of jobs) {
        const jobId = job.objectID || job.id || crypto.randomUUID();
        const key = `job:${jobId}`;
        
        try {
          await client.json.set(key, '$', job);
          seeded++;
          
          if (seeded % 100 === 0) {
            console.log(`   Seeded ${seeded}/${jobs.length} jobs...`);
          }
        } catch (err) {
          console.error(`❌ Failed to seed job ${jobId}:`, err);
        }
      }
      
      console.log(`✅ Seeded ${seeded} jobs successfully`);
    }

  } catch (error) {
    console.error('❌ Error in ensureJobsIndex:', error);
    process.exit(1);
  } finally {
    await client.quit();
    console.log('🔌 Redis connection closed');
  }
}

// Run the script
ensureJobsIndex().catch(console.error);