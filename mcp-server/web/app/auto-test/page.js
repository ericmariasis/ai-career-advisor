// app/auto-test/page.tsx
'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Test;
const react_1 = require("react");
const algolia_1 = require("../../lib/algolia");
function Test() {
    (0, react_1.useEffect)(() => {
        (async () => {
            const { results } = await algolia_1.searchClient.search([
                { indexName: algolia_1.indexName, query: 'foo', params: { hitsPerPage: 1 } },
            ]);
            console.log(results);
        })();
    }, []);
    return null;
}
