import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Dev proxy routes /api/v1/* directly to the Fastify backend on 4310
  // Eliminating browser CORS mismatches during local development
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:4310/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
