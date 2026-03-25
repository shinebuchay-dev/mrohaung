import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== 'production';

const nextConfig: NextConfig = {
  trailingSlash: true,
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/profile/:username',
        destination: '/profile',
      },
      {
        source: '/profile/:username/:postId',
        destination: '/profile',
      }
    ];
  }
};

export default nextConfig;
