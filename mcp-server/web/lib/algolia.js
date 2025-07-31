"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexName = void 0;
// web/lib/algolia.ts
exports.indexName = (_a = process.env.NEXT_PUBLIC_ALGOLIA_INDEX) !== null && _a !== void 0 ? _a : 'jobs';
