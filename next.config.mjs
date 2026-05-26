/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
