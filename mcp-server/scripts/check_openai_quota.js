"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const axios_1 = __importDefault(require("axios"));
async function main() {
    var _a, _b;
    const threshold = Number((_a = process.argv[2]) !== null && _a !== void 0 ? _a : '5'); // $5 default
    const hardLimit = Number((_b = process.env.OPENAI_HARD_LIMIT_USD) !== null && _b !== void 0 ? _b : '0');
    if (!hardLimit) {
        console.warn('[quota‑check] OPENAI_HARD_LIMIT_USD secret is missing ‑‑ skipping check');
        return; // exit 0 so workflow continues
    }
    /* ---------- usage endpoint (still works with API key) ---------- */
    const headers = {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'OpenAI-Beta': 'usage-1', // <-- REQUIRED for usage endpoint
    };
    const urlUsage = 'https://api.openai.com/dashboard/billing/usage';
    console.log('[quota‑debug]', urlUsage, headers);
    const today = new Date().toISOString().slice(0, 10); // YYYY‑MM‑DD
    const start = today.slice(0, 8) + '01'; // 1st of month
    const { data } = await axios_1.default.get(`${urlUsage}?start_date=${start}&end_date=${today}`, { headers });
    const usedUSD = data.total_usage / 100; // cents → USD
    const remaining = hardLimit - usedUSD;
    console.log(`OpenAI quota: $${usedUSD.toFixed(2)} used / $${hardLimit.toFixed(2)} limit`);
    if (remaining < threshold) {
        console.error(`❌ Remaining quota $${remaining.toFixed(2)} < threshold $${threshold}`);
        process.exit(1);
    }
    console.log(`✅ Remaining quota $${remaining.toFixed(2)} is above threshold.`);
}
main().catch((err) => {
    var _a, _b;
    const msg = (_b = (_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : err;
    console.warn('[quota‑check] usage endpoint failed – continuing anyway');
    console.warn('Details:', JSON.stringify(msg, null, 2));
    /* do NOT exit(1); just return so GitHub Actions step succeeds */
});
