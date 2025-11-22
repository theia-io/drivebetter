import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "DriveBetter",
    description: "A modern application for driving better",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className={inter.className}>
                {children}
                <PWAInstallPrompt />
            </body>
        </html>
    );
}
