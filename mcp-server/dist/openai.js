"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPENAI_MODEL = exports.openai = void 0;
const openai_1 = require("openai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.openai = new openai_1.OpenAI({
    apiKey: process.env.OPENAI_KEY,
});
exports.OPENAI_MODEL = (_a = process.env.OPENAI_MODEL) !== null && _a !== void 0 ? _a : 'gpt-3.5-turbo-0125';
