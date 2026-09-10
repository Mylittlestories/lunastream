/** @type {import('next').NextConfig} */
const isMobileBuild = process.env.BUILD_TARGET === 'mobile';

const nextConfig = {
  output: isMobileBuild ? 'export' : 'standalone',
  images: {
    unoptimized: true,
  },
  trailingSlash: true, // Required for static export
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Skip API routes for static mobile builds
  ...(isMobileBuild && {
    rewrites: async () => {
      return [
        {
          source: '/api/:path*',
          destination: '/api/:path*',
        },
      ];
    },
  }),
};

module.exports = nextConfig;
