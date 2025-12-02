// components/ProtectedLayout.tsx
"use client";

import AppVersion from "@/components/meta-info/app-version";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Navigation, { NAVIGATION_HEIGHT_SUFFIX } from "./navigation/Navigation";
import FocusedRide from "./ui/ride/FocusedRide";

interface ProtectedLayoutProps {
    children: React.ReactNode;
}

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
    const { isAuthenticated, user, fetchMe } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        (async () => {
            const resolvedUser = user || (await fetchMe());
            if (!resolvedUser) {
                router.push("/login");
            }
        })();
    }, [isAuthenticated, user, router, fetchMe]);

    if (!isAuthenticated || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Redirecting to login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* fixed top + bottom nav live inside Navigation */}
            <Navigation />

            <div className={` pt-${NAVIGATION_HEIGHT_SUFFIX} pb-16 `}>
                <FocusedRide />

                {/* reserve space: 4rem top bar, ~4rem bottom bar on mobile */}
                <main className={`max-w-7xl mx-automt-4 px-4 sm:px-6 lg:px-8`}>{children}</main>
            </div>

            <AppVersion className="hidden md:block" />
        </div>
    );
}
