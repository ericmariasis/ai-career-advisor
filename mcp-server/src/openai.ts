import { OpenAI } from 'openai';
import dotenv from 'dotenv';
dotenv.config();

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});
export const OPENAI_MODEL =
  process.env.OPENAI_MODEL ?? 'gpt-3.5-turbo-0125';
