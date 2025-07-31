"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/insightsServer.ts
const search_insights_1 = __importDefault(require("search-insights"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config(); // so .env is loaded
// initialise once per Node process
(0, search_insights_1.default)('init', {
    appId: process.env.ALGOLIA_APP_ID,
    apiKey: process.env.ALGOLIA_SEARCH_KEY, // **search‑only** key is OK
    region: 'us', // or 'eu' if your index is there
});
exports.default = search_insights_1.default;
