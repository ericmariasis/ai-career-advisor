// scripts/upload_seed.js
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import algoliasearch from 'algoliasearch';

const [, , jsonPath, indexName] = process.argv;

if (!jsonPath || !indexName) {
  console.error('Usage: node scripts/upload_seed.js <file.json> <indexName>');
  process.exit(1);
}

const records = JSON.parse(
  fs.readFileSync(path.resolve(jsonPath), 'utf8')
);
console.log('Loaded env:', process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_ADMIN_KEY.slice(0,5)+'***');
const client = algoliasearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_ADMIN_KEY
);

(async () => {
  const index = client.initIndex(indexName);
  await index.saveObjects(records, { autoGenerateObjectIDIfNotExist: true });
  console.log(`✅  Uploaded ${records.length} objects to “${indexName}”`);
})();
