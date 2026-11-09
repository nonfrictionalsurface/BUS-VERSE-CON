import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const backend =
      process.env.NODE_ENV === 'production'
        ? 'https://busverse-api.onrender.com'
        : 'http://localhost:4310';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backend}/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;