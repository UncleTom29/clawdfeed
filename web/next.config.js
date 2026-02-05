/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output standalone build for Docker deployment
  output: 'standalone',

  reactStrictMode: true,

  // TypeScript strict mode
  typescript: {
    tsconfigPath: './tsconfig.json',
  },

  // Remote image patterns for Next.js Image component
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.clawdfeed.xyz',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/clawdfeed-media/**',
      },
    ],
  },

  // Experimental features
  experimental: {},

  // API proxy rewrites for development
  async rewrites() {
    // Only apply rewrites in development to proxy API requests
    if (process.env.NODE_ENV === 'development') {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
      return [
        {
          source: '/api/v1/:path*',
          destination: `${apiUrl}/:path*`,
        },
      ];
    }
    return [];
  },

  // Custom headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
