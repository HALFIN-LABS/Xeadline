/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Ignore ESLint errors during production build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore TypeScript errors during production build
    ignoreBuildErrors: true,
  },
  api: {
    // Increase the body parser size limit for API routes
    bodyParser: {
      sizeLimit: '10mb',
    },
    // Increase response limit
    responseLimit: '10mb',
  },
  // Disable file watching completely to work around Watchpack issues
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  // Disable webpack file watching
  webpack: (config, { isServer, dev }) => {
    if (dev) {
      // Completely disable file watching in development
      config.watchOptions = {
        ignored: ['**/*'],
        poll: false,
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      }
    ],
    domains: ['robohash.org'], // Keep for backward compatibility
  },
  // Add rewrites for .well-known paths
  async rewrites() {
    return [
      {
        source: '/.well-known/nostr.json',
        destination: '/api/.well-known/nostr.json',
      },
    ];
  },
  
  // Add security headers
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live; script-src-elem 'self' 'unsafe-inline' https://vercel.live; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https: wss:; font-src 'self'; object-src 'none'; media-src 'self' blob: https:; frame-src 'self';"
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      },
      {
        // Add CORS headers for media files
        source: '/api/storage/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,POST' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
          { key: 'Cache-Control', value: 'public, max-age=31536000' }
        ]
      }
    ];
  },
}

module.exports = nextConfig
