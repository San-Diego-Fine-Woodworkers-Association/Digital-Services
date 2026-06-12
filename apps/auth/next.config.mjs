/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@sdfwa/ui"],
  output: 'standalone',
  cacheComponents: true,
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
}

export default nextConfig
