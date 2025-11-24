import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { PWARegister } from "./pwa-register";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "DriveBetter",
    description: "A modern application for driving better",
    manifest: "/manifest.json",
    themeColor: "#000000",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <PWARegister />
                {children}
                <PWAInstallPrompt />
            </body>
        </html>
    );
}
