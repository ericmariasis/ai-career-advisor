"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const embeddings_1 = require("../src/lib/embeddings");
(async () => {
    const vec = await (0, embeddings_1.embedText)('Software engineer with Python and ML experience');
    console.log('vector length →', vec.length); // should log 1536
    console.log('first 5 dims →', [...vec.slice(0, 5)]);
})();
