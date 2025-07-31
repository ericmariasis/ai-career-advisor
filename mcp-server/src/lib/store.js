"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleFavorite = toggleFavorite;
exports.getFavorites = getFavorites;
// src/lib/store.ts
const node_path_1 = require("node:path");
const node_fs_1 = require("node:fs");
const lowdb_1 = __importDefault(require("lowdb"));
const FileSync_1 = __importDefault(require("lowdb/adapters/FileSync"));
/* ------------------------------------------------------------------ */
/* Init LowDB (sync, CJS‑friendly)                                     */
/* ------------------------------------------------------------------ */
const DATA_DIR = (0, node_path_1.join)(process.cwd(), '.data');
const DB_FILE = (0, node_path_1.join)(DATA_DIR, 'favorites.json');
// ensure .data/ exists
(0, node_fs_1.mkdirSync)(DATA_DIR, { recursive: true });
const adapter = new FileSync_1.default(DB_FILE);
const db = (0, lowdb_1.default)(adapter);
// seed file on first run
db.defaults({ favorites: {} }).write();
/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function toggleFavorite(userToken, objectID, save) {
    var _a;
    // get current list for that user (or empty array)
    const current = (_a = db.get(`favorites.${userToken}`).value()) !== null && _a !== void 0 ? _a : [];
    const set = new Set(current);
    save ? set.add(objectID) : set.delete(objectID);
    db.set(`favorites.${userToken}`, [...set]).write();
    return set.size; // so the route can return “total”
}
function getFavorites(userToken) {
    var _a;
    return (_a = db.get(`favorites.${userToken}`).value()) !== null && _a !== void 0 ? _a : [];
}
