/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.sanity.io',
      },
    ],
  },
};

module.exports = nextConfig;
