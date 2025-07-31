"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobsIndex = exports.searchClient = void 0;
// src/lib/algolia.ts
const algoliasearch_1 = __importDefault(require("algoliasearch"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const appId = process.env.ALGOLIA_APP_ID;
const apiKey = process.env.ALGOLIA_ADMIN_KEY;
const indexName = (_a = process.env.ALGOLIA_INDEX) !== null && _a !== void 0 ? _a : 'jobs';
if (!appId || !apiKey) {
    throw new Error('Missing ALGOLIA_APP_ID or ALGOLIA_ADMIN_KEY');
}
exports.searchClient = (0, algoliasearch_1.default)(appId, apiKey);
exports.jobsIndex = exports.searchClient.initIndex(indexName);
