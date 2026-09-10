/** @type {import('next').NextConfig} */

// For Android builds: use 'export' for fully static files
// For Desktop/Electron builds: use 'standalone' for server bundling
// For Web deployment: use 'standalone'
const isAndroid = process.env.BUILD_TARGET === 'mobile';

const nextConfig = {
  output: isAndroid ? 'export' : 'standalone',
  images: {
    unoptimized: true,
  },
  trailingSlash: isAndroid,
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
