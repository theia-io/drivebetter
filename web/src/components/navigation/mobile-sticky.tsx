"use client";

import { useDriverInboxCount } from "@/stores/rideClaims";
import { Bell, CalendarDays, Plus, Route, UserCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    CALENDAR_ITEM,
    CREATE_RIDE_ITEM,
    MY_ASSIGNMENTS_ITEM,
    MY_CREATED_ITEM,
    NEW_RIDES_ITEM
} from "./data";
import { isActive } from "./is-active";

export default function MobileSticky() {
    const pathname = usePathname();
    const { data: inboxCountData } = useDriverInboxCount("available");
    const newRidesCount = inboxCountData?.count ?? 0;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-1110 md:hidden bg-white border-t">
            <div className="mx-auto max-w-lg">
                <div className="grid h-16 grid-cols-5 text-xs text-gray-500">
                    {/* 1. Calendar */}
                    <div className="flex items-center justify-center">
                        <Link
                            href={CALENDAR_ITEM.href}
                            className={`inline-flex flex-col items-center justify-center ${
                                isActive(CALENDAR_ITEM.href, pathname)
                                    ? "text-indigo-600"
                                    : "text-gray-500"
                            }`}
                        >
                            <CalendarDays className="h-5 w-5" />
                            <span className="mt-0.5">Calendar</span>
                        </Link>
                    </div>

                    {/* 2. New Rides with indicator */}
                    <div className="flex items-center justify-center">
                        <Link
                            href={NEW_RIDES_ITEM.href}
                            className={`inline-flex flex-col items-center justify-center ${
                                isActive(NEW_RIDES_ITEM.href, pathname)
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
                    </div>

                    {/* 3. Create Ride (center, green emphasis but no overlap) */}
                    <div className="flex items-center justify-center">
                        <Link
                            href={CREATE_RIDE_ITEM.href}
                            className="inline-flex flex-col items-center justify-center text-emerald-600"
                        >
                            <div className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-emerald-600 text-white shadow-md border border-emerald-700">
                                <Plus className="h-5 w-5" />
                            </div>
                            <span className="mt-0.5 text-[11px] font-medium">Create</span>
                        </Link>
                    </div>

                    {/* 4. My Assignments */}
                    <div className="flex items-center justify-center">
                        <Link
                            href={MY_ASSIGNMENTS_ITEM.href}
                            className={`inline-flex flex-col items-center justify-center ${
                                isActive(MY_ASSIGNMENTS_ITEM.href, pathname)
                                    ? "text-indigo-600"
                                    : "text-gray-500"
                            }`}
                        >
                            <UserCheck className="h-5 w-5" />
                            <span className="mt-0.5">Assigned</span>
                        </Link>
                    </div>

                    {/* 5. My Created */}
                    <div className="flex items-center justify-center">
                        <Link
                            href={MY_CREATED_ITEM.href}
                            className={`inline-flex flex-col items-center justify-center ${
                                isActive(MY_CREATED_ITEM.href, pathname)
                                    ? "text-indigo-600"
                                    : "text-gray-500"
                            }`}
                        >
                            <Route className="h-5 w-5" />
                            <span className="mt-0.5">Created</span>
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
