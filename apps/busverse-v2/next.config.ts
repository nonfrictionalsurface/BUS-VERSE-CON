import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [{
      source: '/api/v1/:path*',
      destination: 'http://localhost:4310/v1/:path*',
    }];
  },
};

export default nextConfig;
