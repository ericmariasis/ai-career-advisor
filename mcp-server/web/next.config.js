"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// web/next.config.ts
/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',  // Required for Docker deployments
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
                destination: 'http://server:4000/api/:path*',
            },
        ];
    },
      /** Tell webpack what to do with *.node files */
  webpack(config, { isServer }) {
    // 1️⃣  Load native binaries with node-loader
    config.module.rules.push({
      test: /\.node$/,
      loader: 'node-loader',
    });

    // 2️⃣  Don’t try to bundle canvas into the client build
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
      };
    }

    return config;
  },
};
module.exports = nextConfig;
