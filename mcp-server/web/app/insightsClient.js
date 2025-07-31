'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserToken = getUserToken;
const search_insights_1 = __importDefault(require("search-insights"));
/* one-time init during Fast-Refresh */
if (!globalThis._algoliaInsightsInit) {
    (0, search_insights_1.default)('init', {
        appId: process.env.NEXT_PUBLIC_ALGOLIA_APP_ID,
        apiKey: process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_ONLY_API_KEY, // search-only key
        useCookie: true, // lets Algolia set an anonymous userToken cookie
    });
    globalThis._algoliaInsightsInit = true;
}
/* ----------  ★ NEW helper so cards can grab userToken  ---------- */
function getUserToken() {
    var _a, _b, _c;
    try {
        // • new SDKs expose aa.getUserToken()
        // • older ones use the command syntax: aa('getUserToken')
        // • neither has proper typings yet → cast to any
        const token = (_c = (_b = (_a = search_insights_1.default).getUserToken) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : search_insights_1.default('getUserToken');
        if (typeof token === 'string' && token.length)
            return token;
    }
    catch {
        /* ignore */
    }
    return 'unknown-user';
}
exports.default = search_insights_1.default;
