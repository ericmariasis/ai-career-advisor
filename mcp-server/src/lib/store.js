"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleFavorite = toggleFavorite;
exports.getFavorites = getFavorites;
// src/lib/store.ts
// 🚀  Redis client (reuse the singleton)
const redis_1 = __importDefault(require("../lib/redis"));
const favKey = (user) => `user:${user}:favs`;
/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
async function toggleFavorite(userToken, objectID, save) {
    const key = favKey(userToken);
    if (save)
        await redis_1.default.hSet(key, objectID, 1);
    else
        await redis_1.default.hDel(key, objectID);
    return await redis_1.default.hLen(key); // new total
}
async function getFavorites(userToken) {
    return await redis_1.default.hKeys(favKey(userToken));
}
