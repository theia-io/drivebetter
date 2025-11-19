import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "BetterDriver",
        short_name: "BetterDriver",
        description: "BetterDriver is a platform for managing your rides and drivers",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#000000",
        icons: [
            {
                src: "/drivebetter-logo.png",
                sizes: "192x192",
                type: "image/png",
            },
            {
                src: "/drivebetter-logo.png",
                sizes: "512x512",
                type: "image/png",
            },
        ],
    };
}
