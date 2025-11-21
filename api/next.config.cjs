/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    experimental: { typedRoutes: true },
    images: {
        remotePatterns: [{ protocol: "https", hostname: "**.drivebetter.co" }],
    },
    output: "standalone",
};

module.exports = nextConfig;
