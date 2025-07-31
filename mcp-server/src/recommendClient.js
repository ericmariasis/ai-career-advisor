"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recommendClient = void 0;
// src/recommendClient.ts
const recommend_1 = require("@algolia/recommend");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)(); // load .env
/**
 * The `recommendClient` factory is callable:
 *   recommendClient(appId, apiKey)
 */
exports.recommendClient = (0, recommend_1.recommendClient)(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_ADMIN_KEY);
