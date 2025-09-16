/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@ui", "@shared", "@config"],
  experimental: {
    appDir: true,
  },
  output: 'standalone',
}

module.exports = nextConfig
