"use client";

import { useAuthStore } from "@/stores/auth";
import { useDriverInboxCount } from "@/stores/rideClaims";
import {
    Bell,
    Calendar,
    CalendarDays,
    LogOut,
    Menu,
    MoreHorizontal,
    Plus,
    Route,
    Share2,
    UserCheck,
    User as UserIcon,
    Users,
    UsersRound,
    X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useMemo, useState } from "react";
import { Button } from "./ui";

type NavItem = {
    name: string;
    href: string;
    requiredRoles?: string[];
    icon?: ReactNode;
};

const navigation: NavItem[] = [
    {
        name: "Create Ride",
        href: "/rides/new",
        requiredRoles: ["driver", "dispatcher", "admin"],
        icon: <Plus className="h-4 w-4" />,
    },
    {
        name: "Groups",
        href: "/groups",
        requiredRoles: ["driver", "dispatcher", "admin"],
        icon: <Users className="h-4 w-4" />,
    },
    {
        name: "All Rides",
        href: "/rides",
        requiredRoles: ["dispatcher", "admin"],
        icon: <Route className="h-4 w-4" />,
    },
    // Driver-only views
    {
        name: "Calendar",
        href: "/calendar",
        requiredRoles: ["driver"],
        icon: <Calendar className="h-4 w-4" />,
    },
    {
        name: "My Created",
        href: "/rides",
        requiredRoles: ["driver"],
        icon: <Route className="h-4 w-4" />,
    },
    {
        name: "My Assignments",
        href: "/my-rides",
        requiredRoles: ["driver"],
        icon: <UserCheck className="h-4 w-4" />,
    },
    {
        name: "New Rides",
        href: "/shared-rides",
        requiredRoles: ["driver"],
        icon: <Share2 className="h-4 w-4" />,
    },
    {
        name: "Users",
        href: "/users",
        requiredRoles: ["admin", "dispatcher"],
        icon: <UsersRound className="h-4 w-4" />,
    },
];

const getNavigationForUser = (item: NavItem, userRoles?: string[]): NavItem => {
    if (item.name !== "Users") return item;
    const roles = userRoles || [];
    if (roles.includes("admin")) return item;
    if (roles.includes("dispatcher")) {
        return { ...item, name: "Drivers", href: "/users?role=driver" };
    }
    return item;
};

const hasRequiredRole = (userRoles?: string[], requiredRoles?: string[]): boolean => {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    return Array.isArray(userRoles) && requiredRoles.some((r) => userRoles.includes(r));
};

export default function Navigation() {
    const pathname = usePathname();
    const { user, logout } = useAuthStore();
    const userRoles = user?.roles;
    const isDriver = !!userRoles?.includes("driver");

    const { data: inboxCountData } = useDriverInboxCount(isDriver ? "available" : undefined);
    const newRidesCount = inboxCountData?.count ?? 0;

    const [mobileOpen, setMobileOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);

    const items = useMemo(
        () =>
            navigation
                .filter((item) => hasRequiredRole(userRoles, item.requiredRoles))
                .map((item) => getNavigationForUser(item, userRoles)),
        [userRoles]
    );

    const isActive = (href: string) => {
        const base = href.split("?")[0];
        return pathname === href || pathname === base;
    };

    const renderNavLabel = (item: NavItem) => {
        if (item.name === "New Rides") {
            return (
                <span className="inline-flex items-center gap-1.5">
                    <span className="relative inline-flex">
                        <Bell className="h-4 w-4" aria-hidden="true" />
                        {isDriver && newRidesCount > 0 && (
                            <span
                                className="absolute inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-600 border-2 border-white rounded-full -top-2 -right-2"
                                aria-label={`${newRidesCount} new rides`}
                            >
                                {newRidesCount > 99 ? "99+" : newRidesCount}
                            </span>
                        )}
                    </span>
                    <span>New Rides</span>
                </span>
            );
        }

        return (
            <span className="inline-flex items-center gap-1.5">
                {item.icon ? <span aria-hidden="true">{item.icon}</span> : null}
                <span>{item.name}</span>
            </span>
        );
    };

    const createRideItem = items.find((i) => i.name === "Create Ride") || null;

    const primaryNames: string[] = ["New Rides", "Calendar", "My Assignments", "My Created"];
    const primaryItems = items.filter(
        (i) => primaryNames.includes(i.name) && i.name !== "Create Ride"
    );
    const dropdownItems = items.filter(
        (i) => i.name !== "Create Ride" && !primaryNames.includes(i.name)
    );

    const findByName = (name: string) => items.find((i) => i.name === name) || null;

    const bottomCreate = findByName("Create Ride");
    const bottomNewRides = findByName("New Rides");
    const bottomCalendar = findByName("Calendar");
    const bottomAssignments = findByName("My Assignments");
    const bottomCreated = findByName("My Created");

    // Mobile menu items without "Create Ride" (we show it as a primary button instead)
    const mobileItems = items.filter((i) => i.name !== "Create Ride");

    return (
        <>
            {/* TOP NAVBAR */}
            <nav className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        {/* Left: brand + desktop main links */}
                        <div className="flex items-center">
                            <div className="flex-shrink-0 flex items-center">
                                <h1 className="text-xl font-bold text-gray-900">
                                    <Link href="/">DriveBetter</Link>
                                </h1>
                            </div>

                            <div className="ml-6 hidden sm:flex sm:items-center sm:space-x-4">
                                {primaryItems.map((item) => (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={`inline-flex items-center px-2 pt-1 border-b-2 text-sm font-medium ${
                                            isActive(item.href)
                                                ? "border-indigo-500 text-gray-900"
                                                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                        }`}
                                    >
                                        {renderNavLabel(item)}
                                    </Link>
                                ))}

                                {dropdownItems.length > 0 && (
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setMoreOpen((prev) => !prev)}
                                            className={`inline-flex items-center gap-1 px-2 pt-1 border-b-2 text-sm font-medium ${
                                                dropdownItems.some((d) => isActive(d.href))
                                                    ? "border-indigo-500 text-gray-900"
                                                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                            }`}
                                        >
                                            <MoreHorizontal className="h-4 w-4" />
                                            <span>More</span>
                                        </button>
                                        {moreOpen && (
                                            <div className="absolute z-40 mt-2 w-56 rounded-md bg-white shadow-lg border border-gray-100">
                                                <div className="py-1">
                                                    {dropdownItems.map((item) => (
                                                        <Link
                                                            key={item.name}
                                                            href={item.href}
                                                            onClick={() => setMoreOpen(false)}
                                                            className={`flex items-center gap-2 px-3 py-2 text-sm ${
                                                                isActive(item.href)
                                                                    ? "bg-indigo-50 text-indigo-700"
                                                                    : "text-gray-700 hover:bg-gray-50"
                                                            }`}
                                                        >
                                                            {renderNavLabel(item)}
                                                        </Link>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right: create ride + user menu + mobile burger */}
                        <div className="flex items-center">
                            <div className="hidden sm:flex items-center space-x-4">
                                {createRideItem && (
                                    <Link href={createRideItem.href}>
                                        <Button
                                            variant="solid"
                                            size="sm"
                                            className="bg-emerald-600 hover:bg-emerald-700 border border-emerald-600 text-white shadow-sm"
                                        >
                                            <Plus className="h-4 w-4 mr-1" />
                                            <span>Create ride</span>
                                        </Button>
                                    </Link>
                                )}

                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setUserMenuOpen((prev) => !prev)}
                                        className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-2.5 py-1 border border-gray-200 hover:bg-gray-100"
                                    >
                                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                                            <UserIcon className="h-4 w-4" />
                                        </span>
                                        <span className="text-sm font-medium text-gray-700 max-w-[8rem] truncate">
                                            {user?.name || "Account"}
                                        </span>
                                    </button>

                                    {userMenuOpen && (
                                        <div className="absolute right-0 mt-2 w-48 rounded-md bg-white shadow-lg border border-gray-100 z-50">
                                            <div className="py-1">
                                                <Link
                                                    href="/account"
                                                    onClick={() => setUserMenuOpen(false)}
                                                    className={`block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 ${
                                                        pathname === "/account"
                                                            ? "bg-indigo-50 text-indigo-700"
                                                            : ""
                                                    }`}
                                                >
                                                    Account
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setUserMenuOpen(false);
                                                        logout();
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
                                                >
                                                    <LogOut className="h-4 w-4" />
                                                    <span>Logout</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                type="button"
                                className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:bg-gray-100"
                                onClick={() => setMobileOpen((v) => !v)}
                                aria-label="Toggle menu"
                            >
                                {mobileOpen ? (
                                    <X className="h-5 w-5" />
                                ) : (
                                    <Menu className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile slide-down panel */}
                {mobileOpen && (
                    <div className="sm:hidden border-t bg-white">
                        {/* Create ride primary button (same style as desktop, full width) */}
                        {createRideItem && (
                            <div className="px-4 pt-3 pb-2">
                                <Link
                                    href={createRideItem.href}
                                    onClick={() => setMobileOpen(false)}
                                >
                                    <Button
                                        variant="solid"
                                        size="sm"
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 border border-emerald-600 text-white shadow-sm"
                                    >
                                        <Plus className="h-4 w-4 mr-1" />
                                        <span>Create ride</span>
                                    </Button>
                                </Link>
                            </div>
                        )}

                        {/* Other nav items */}
                        <div className="pt-1 pb-3 space-y-1">
                            {mobileItems.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={`flex items-center justify-between pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                                        isActive(item.href)
                                            ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                                            : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                                    }`}
                                >
                                    <span className="inline-flex items-center gap-2">
                                        {renderNavLabel(item)}
                                    </span>
                                </Link>
                            ))}
                        </div>

                        <div className="border-t px-4 py-3 space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                                    <UserIcon className="h-4 w-4" />
                                </span>
                                <Link
                                    href="/account"
                                    onClick={() => setMobileOpen(false)}
                                    className="block text-sm font-medium text-gray-900 hover:underline"
                                >
                                    {user?.name || "Account"}
                                </Link>
                            </div>
                            <div className="border-t pt-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMobileOpen(false);
                                        logout();
                                    }}
                                    className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    <LogOut className="h-4 w-4" />
                                    <span>Logout</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            {/* BOTTOM NAV (mobile only, Flowbite-style application bar) */}
            {isDriver && (
                <nav className="fixed bottom-0 left-0 right-0 z-30 sm:hidden bg-white border-t">
                    <div className="mx-auto max-w-lg">
                        <div className="grid h-16 grid-cols-5 text-xs text-gray-500">
                            {/* 1. Calendar */}
                            <div className="flex items-center justify-center">
                                {bottomCalendar && (
                                    <Link
                                        href={bottomCalendar.href}
                                        className={`inline-flex flex-col items-center justify-center ${
                                            isActive(bottomCalendar.href)
                                                ? "text-indigo-600"
                                                : "text-gray-500"
                                        }`}
                                    >
                                        <CalendarDays className="h-5 w-5" />
                                        <span className="mt-0.5">Calendar</span>
                                    </Link>
                                )}
                            </div>

                            {/* 2. New Rides with indicator */}
                            <div className="flex items-center justify-center">
                                {bottomNewRides && (
                                    <Link
                                        href={bottomNewRides.href}
                                        className={`inline-flex flex-col items-center justify-center ${
                                            isActive(bottomNewRides.href)
                                                ? "text-indigo-600"
                                                : "text-gray-500"
                                        }`}
                                    >
                                        <span className="relative inline-flex">
                                            <Bell className="h-5 w-5" />
                                            {newRidesCount > 0 && (
                                                <span
                                                    className="absolute inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-600 border-2 border-white rounded-full -top-2 -right-2"
                                                    aria-label={`${newRidesCount} new rides`}
                                                >
                                                    {newRidesCount > 99 ? "99+" : newRidesCount}
                                                </span>
                                            )}
                                        </span>
                                        <span className="mt-0.5">New</span>
                                    </Link>
                                )}
                            </div>

                            {/* 3. Create Ride (center, green emphasis but no overlap) */}
                            <div className="flex items-center justify-center">
                                {bottomCreate && (
                                    <Link
                                        href={bottomCreate.href}
                                        className="inline-flex flex-col items-center justify-center text-emerald-600"
                                    >
                                        <div className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-emerald-600 text-white shadow-md border border-emerald-700">
                                            <Plus className="h-5 w-5" />
                                        </div>
                                        <span className="mt-0.5 text-[11px] font-medium">
                                            Create
                                        </span>
                                    </Link>
                                )}
                            </div>

                            {/* 4. My Assignments */}
                            <div className="flex items-center justify-center">
                                {bottomAssignments && (
                                    <Link
                                        href={bottomAssignments.href}
                                        className={`inline-flex flex-col items-center justify-center ${
                                            isActive(bottomAssignments.href)
                                                ? "text-indigo-600"
                                                : "text-gray-500"
                                        }`}
                                    >
                                        <UserCheck className="h-5 w-5" />
                                        <span className="mt-0.5">Assigned</span>
                                    </Link>
                                )}
                            </div>

                            {/* 5. My Created */}
                            <div className="flex items-center justify-center">
                                {bottomCreated && (
                                    <Link
                                        href={bottomCreated.href}
                                        className={`inline-flex flex-col items-center justify-center ${
                                            isActive(bottomCreated.href)
                                                ? "text-indigo-600"
                                                : "text-gray-500"
                                        }`}
                                    >
                                        <Route className="h-5 w-5" />
                                        <span className="mt-0.5">Created</span>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </nav>
            )}
        </>
    );
}
