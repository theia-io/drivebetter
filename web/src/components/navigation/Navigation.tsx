"use client";

import { useAuthStore } from "@/stores/auth";
import Link from "next/link";
import { NavItem } from "./data";
import DesktopMenu from "./desktop-menu";
import MobileMenu from "./mobile-menu";
import MobileSticky from "./mobile-sticky";

export default function Navigation() {
    const { user, logout } = useAuthStore();

    const renderNavLabel = (item: NavItem) => {
        return (
            <span className="inline-flex items-center gap-1.5">
                {item.icon ? <span aria-hidden="true">{item.icon}</span> : null}
                <span>{item.name}</span>
            </span>
        );
    };

    return (
        <>
            {/* TOP NAVBAR */}
            <nav className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center">
                        {/* Left: brand + desktop main links */}
                        <h1 className="text-xl font-bold text-gray-900">
                            <Link href="/">DriveBetter</Link>
                        </h1>

                        <DesktopMenu className="ml-6" user={user} renderNavLabel={renderNavLabel} />
                        <MobileMenu
                            className="ml-auto"
                            renderNavLabel={renderNavLabel}
                            user={user}
                            logout={logout}
                        />
                    </div>
                </div>
            </nav>

            <MobileSticky />
        </>
    );
}
