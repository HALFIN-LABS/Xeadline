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
}

module.exports = nextConfig
