/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    experimental: { typedRoutes: true },
    images: {
        remotePatterns: [
            { protocol: "https", hostname: "**.drivebetter.app" }
        ]
    },
    output: "standalone"
};

export default nextConfig;
