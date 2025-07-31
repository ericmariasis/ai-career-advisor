"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// web/next.config.ts
/** @type {import('next').NextConfig} */
const nextConfig = {
    env: {
        NEXT_PUBLIC_ALGOLIA_APP_ID: process.env.NEXT_PUBLIC_ALGOLIA_APP_ID,
        NEXT_PUBLIC_ALGOLIA_SEARCH_ONLY_API_KEY: process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_ONLY_API_KEY,
        NEXT_PUBLIC_ALGOLIA_INDEX: process.env.NEXT_PUBLIC_ALGOLIA_INDEX,
    },
    // 👇  put it right here (root‑level, not under experimental)
    transpilePackages: ['pdfjs-dist'],
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://localhost:4000/api/:path*',
            },
        ];
    },
};
module.exports = nextConfig;
