/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 14 uses experimental.serverComponentsExternalPackages; the top-level
  // `serverExternalPackages` is Next 15+ only.
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
