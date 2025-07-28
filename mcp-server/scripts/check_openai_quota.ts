/**
 * Exit 1 when remaining quota < thresholdUSD (default $5)
 *
 * Usage:  node scripts/check_openai_quota.js   10
 *         npx tsx  scripts/check_openai_quota.ts 7
 */
import 'dotenv/config';
import axios from 'axios';

async function main() {
  const threshold = Number(process.argv[2] ?? '5');   // $5 default

  // -------- correct headers (no Beta flag) ----------
  const headers = {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'OpenAI-Beta': 'usage-1',        // REQUIRED for the v1 billing endpoints
    };
    
    const urlUsage  = 'https://api.openai.com/v1/dashboard/billing/usage';
    const urlGrants = 'https://api.openai.com/v1/dashboard/billing/credit_grants';

  // current billing cycle (UTC)
  const today = new Date().toISOString().slice(0, 10);   // YYYY‑MM‑DD
  const start = today.slice(0, 8) + '01';
  console.log('[quota‑debug] urlUsage  =', `${urlUsage}?start_date=${start}&end_date=${today}`);
  console.log('[quota‑debug] urlGrants =', urlGrants);
  console.log('[quota‑debug] headers   =', headers);

  const [usageRes, grantsRes] = await Promise.all([
    axios.get(`${urlUsage}?start_date=${start}&end_date=${today}`, { headers }),
    axios.get(urlGrants, { headers }),
  ]);

  const used      = usageRes.data.total_usage / 100;      // cents → USD
  const remaining = grantsRes.data.total_available;       // USD
  const limit     = grantsRes.data.total_granted;         // USD

  console.log(`OpenAI quota: $${used.toFixed(2)} used / $${limit.toFixed(2)} limit`);
  if (remaining < threshold) {
    console.error(`❌ Remaining quota $${remaining.toFixed(2)} < threshold $${threshold}`);
    process.exit(1);
  }
  console.log(`✅ Remaining quota $${remaining.toFixed(2)} is above threshold.`);
}

main().catch(err => {
  console.error('Quota check failed', err.response?.data ?? err);
  process.exit(1);
});
