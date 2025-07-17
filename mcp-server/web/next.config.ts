// web/next.config.ts
/** @type {import('next').NextConfig} */
module.exports = {
  // expose these three vars to the client bundle:
  env: {
    NEXT_PUBLIC_ALGOLIA_APP_ID:     process.env.NEXT_PUBLIC_ALGOLIA_APP_ID,
    NEXT_PUBLIC_ALGOLIA_SEARCH_ONLY_API_KEY: process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_ONLY_API_KEY,
    NEXT_PUBLIC_ALGOLIA_INDEX:      process.env.NEXT_PUBLIC_ALGOLIA_INDEX,
  },

  async rewrites() {
    return [
      {
        source:      '/api/:path*',
        destination: 'http://localhost:4000/api/:path*',
      },
    ]
  },
}
