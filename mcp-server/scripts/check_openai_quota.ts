/**
 * Fails with exit 1 when remaining quota < thresholdUSD (default $5).
 *
 * Option B – get the hard‑limit from a GH secret instead of the API, because
 *            credit_grants / subscription require a browser session.
 *
 * Required secrets:
 *   OPENAI_API_KEY        – your normal key (for usage endpoint)
 *   OPENAI_HARD_LIMIT_USD – e.g. "120"  (string so GitHub masks it)
 *
 * Usage:  npx tsx scripts/check_openai_quota.ts [thresholdUSD]
 */

import 'dotenv/config';
import axios from 'axios';

async function main() {
  const threshold = Number(process.argv[2] ?? '5');          // $5 default
  const hardLimit = Number(process.env.OPENAI_HARD_LIMIT_USD ?? '0');

  if (!hardLimit) {
    console.warn(
      '[quota‑check] OPENAI_HARD_LIMIT_USD secret is missing ‑‑ skipping check'
    );
    return; // exit 0 so workflow continues
  }

  /* ---------- usage endpoint (still works with API key) ---------- */
  const headers = { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` };
  const urlUsage = 'https://api.openai.com/dashboard/billing/usage';

  console.log('[quota‑debug]', urlUsage, headers)

  const today = new Date().toISOString().slice(0, 10);       // YYYY‑MM‑DD
  const start = today.slice(0, 8) + '01';                    // 1st of month

  const { data } = await axios.get(
    `${urlUsage}?start_date=${start}&end_date=${today}`,
    { headers }
  );

  const usedUSD   = data.total_usage / 100;                  // cents → USD
  const remaining = hardLimit - usedUSD;

  console.log(
    `OpenAI quota: $${usedUSD.toFixed(2)} used / $${hardLimit.toFixed(
      2
    )} limit`
  );

  if (remaining < threshold) {
    console.error(
      `❌ Remaining quota $${remaining.toFixed(2)} < threshold $${threshold}`
    );
    process.exit(1);
  }

  console.log(
    `✅ Remaining quota $${remaining.toFixed(2)} is above threshold.`
  );
}

main().catch((err) => {
    console.error('OpenAI response', err.response?.data)
  console.error('Quota check failed', err.response?.data ?? err);
  /* Option A: change to “return” so the job continues even if usage fails */
  process.exit(1);
});
