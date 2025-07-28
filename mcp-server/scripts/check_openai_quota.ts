/**
 * Fails with exit code 1 when today's remaining embedding budget < threshold.
 *
 * Usage: pnpm tsx scripts/check_openai_quota.ts  (thresholdUSD)
 */
import 'dotenv/config';
import axios from 'axios';

async function main() {
  const threshold = Number(process.argv[2] ?? '5');            // $5 default
  const headers   = { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` };

  // 1. Retrieve the usage for the current billing period
  const urlUsage = 'https://api.openai.com/dashboard/billing/usage?start_date=2025-07-01&end_date=2025-07-28';
  const urlSubs  = 'https://api.openai.com/dashboard/billing/subscription';

  const [usageRes, subRes] = await Promise.all([
    axios.get(urlUsage, { headers }),
    axios.get(urlSubs,  { headers }),
  ]);

  const used = usageRes.data.total_usage / 100;                // cents → USD
  const limit= subRes.data.hard_limit_usd;
  const remaining = limit - used;

  console.log(`OpenAI quota: $${used.toFixed(2)} used / $${limit} limit`);
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
