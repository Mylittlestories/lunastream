/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Creates standalone Node.js app for Electron
  images: {
    unoptimized: true,
  },
  trailingSlash: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
