// components/navigation/Navigation.tsx
"use client";

import { useAuthStore } from "@/stores/auth";
import Link from "next/link";
import { NavItem } from "./data";
import DesktopMenu from "./desktop-menu";
import MobileMenu from "./mobile-menu";
import MobileSticky from "./mobile-sticky";

export const NAVIGATION_HEIGHT_SUFFIX = "16";

export default function Navigation() {
    const { user, logout } = useAuthStore();

    const renderNavLabel = (item: NavItem) => (
        <span className="inline-flex items-center gap-1.5">
            {item.icon ? <span aria-hidden="true">{item.icon}</span> : null}
            <span>{item.name}</span>
        </span>
    );

    return (
        <>
            {/* fixed top nav on all breakpoints */}
            <nav className="fixed top-0 inset-x-0 z-1110 bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* hotfix for tailwind css to work with dynamic class names */}
                    <div className="hidden h-16 pt-16 "></div>
                    <div className={`flex items-center h-${NAVIGATION_HEIGHT_SUFFIX}`}>
                        {/* brand */}
                        <h1 className="text-xl font-bold text-gray-900">
                            <Link href="/">DriveBetter</Link>
                        </h1>

                        {/* desktop menu */}
                        <DesktopMenu className="ml-6" user={user} renderNavLabel={renderNavLabel} />

                        {/* mobile menu trigger + modal/drawer (keep as is) */}
                        <MobileMenu
                            className="ml-auto z-1110"
                            renderNavLabel={renderNavLabel}
                            user={user}
                            logout={logout}
                        />
                    </div>
                </div>
            </nav>

            {/* bottom nav (mobile) */}
            <MobileSticky />
        </>
    );
}
