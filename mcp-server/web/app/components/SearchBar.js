// components/SearchBar.tsx
'use client';
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SearchBar;
const react_1 = __importStar(require("react"));
const client_1 = require("react-dom/client");
const autocomplete_js_1 = require("@algolia/autocomplete-js");
require("@algolia/autocomplete-theme-classic");
const algoliasearch_1 = require("algoliasearch");
const algolia_1 = require("../../lib/algolia");
function SearchBar({ onSearch, onSelectHit, onClear, }) {
    const containerRef = (0, react_1.useRef)(null);
    const inputRef = (0, react_1.useRef)(null); // 🆕 native <input>
    const panelRef = (0, react_1.useRef)(); // 🆕 store panel
    // ▼▼▼ ADD A REF TO HOLD THE REACT ROOT FOR THE PANEL ▼▼▼
    const panelRootRef = (0, react_1.useRef)(null);
    const [query, setQuery] = (0, react_1.useState)('');
    (0, react_1.useEffect)(() => {
        if (!containerRef.current)
            return;
        const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
        const apiKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_ONLY_API_KEY;
        if (!appId || !apiKey) {
            console.error('Algolia env vars missing → Autocomplete disabled');
            return;
        }
        const client = (0, algoliasearch_1.algoliasearch)(appId, apiKey);
        const panel = (0, autocomplete_js_1.autocomplete)({
            container: containerRef.current,
            placeholder: 'Search job titles, skills…',
            openOnFocus: true,
            // ▼▼▼ ADD THE CUSTOM RENDERER AND RENDER FUNCTIONS ▼▼▼
            renderer: { createElement: react_1.createElement, Fragment: react_1.Fragment },
            render({ children }, root) {
                if (!panelRootRef.current) {
                    panelRootRef.current = (0, client_1.createRoot)(root);
                }
                panelRootRef.current.render(children);
            },
            /* fire parent reset when we clear */
            onReset() {
                onClear === null || onClear === void 0 ? void 0 : onClear(); // ➕ notify page
            },
            getSources() {
                return [
                    {
                        sourceId: 'jobs',
                        getItems({ query }) {
                            return (0, autocomplete_js_1.getAlgoliaResults)({
                                searchClient: client, // your v5 client
                                queries: [
                                    { indexName: algolia_1.indexName, query, params: { hitsPerPage: 5 } },
                                ],
                            });
                        },
                        templates: {
                            item({ item, components }) {
                                var _a;
                                console.log('debug highlightResult', (_a = item._highlightResult) === null || _a === void 0 ? void 0 : _a.title);
                                return (<div className="aa-ItemWrapper">
                    <div className="aa-ItemContent">
                      <div className="aa-ItemTitle">
                        <components.Highlight hit={item} attribute="title"/>
                      </div>
                      <div className="aa-ItemDescription text-sm text-gray-500">
                        {item.company} — {item.location}
                      </div>
                    </div>
                  </div>);
                            },
                            noResults() {
                                return <div className="aa-NoResults p-4">No jobs found.</div>;
                            },
                        },
                        onSelect({ item, setIsOpen }) {
                            onSelectHit === null || onSelectHit === void 0 ? void 0 : onSelectHit(item);
                            onSearch(item.title);
                            setIsOpen(false);
                        },
                    },
                ];
            },
        });
        // keep a handle so the clear‑button can call panelRef.current.reset()
        panelRef.current = panel; // ➕ store reference
        return () => {
            panel.destroy();
            queueMicrotask(() => (panelRootRef.current = null));
            panelRef.current = undefined; // ➕ clear ref on unmount
        };
        /**
         * ‼️  Important: this effect should run only once (mount / unmount).
         *      If it re‑runs on every re‑render, Autocomplete mounts a
         *      second React root on the same DOM node → the warning you saw.
         */
    }, []); // ✏️ was  [onSearch]
    /* ------- CLEAR-BUTTON UI -------- */
    return (<div className="relative">
      <div ref={containerRef} className="w-full"/>
      {query && (<button aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200" onClick={() => {
                var _a, _b;
                (_a = panelRef.current) === null || _a === void 0 ? void 0 : _a.setQuery(''); // wipe store
                (_b = panelRef.current) === null || _b === void 0 ? void 0 : _b.reset(); // triggers onReset
            }}>
          ✕
        </button>)}
    </div>);
}
