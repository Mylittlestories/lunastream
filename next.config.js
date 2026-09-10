/** @type {import('next').NextConfig} */
const isAndroid = process.env.BUILD_TARGET === 'mobile';

const nextConfig = {
  output: isAndroid ? 'export' : 'standalone',
  images: {
    unoptimized: true,
  },
  trailingSlash: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
