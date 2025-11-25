import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { PWARegister } from "../services/pwa-register";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "DriveBetter",
    description: "A modern application for driving better",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
    },
};

export const viewport = {
    themeColor: "#000000",
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
