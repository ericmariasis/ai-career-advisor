// src/recommendClient.ts
import { recommendClient as makeRecommendClient } from '@algolia/recommend';
import { config } from 'dotenv';

config();  // load .env

/** 
 * The `recommendClient` factory is callable:
 *   recommendClient(appId, apiKey)
 */
export const recommendClient = makeRecommendClient(
  process.env.ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_KEY!
);
