/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@ui", "@shared", "@config"],
  output: 'standalone',
}

module.exports = nextConfig
