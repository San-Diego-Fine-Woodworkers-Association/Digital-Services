/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@sdfwa/ui"],
  output: 'standalone',
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
}

export default nextConfig
