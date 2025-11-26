import { User } from "@/types";
import { cn } from "@/utils/css";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { NAVIGATION_ITEMS, NavItem, getNavigationForUser, hasRequiredRole } from "./data";
import { isActive } from "./is-ative";
import UserMenu from "./user-menu";

interface DesktopMenuProps {
    user: User;
    className?: string;
    renderNavLabel: (item: NavItem) => React.ReactNode;
}

export default function DesktopMenu({ user, renderNavLabel, className }: DesktopMenuProps) {
    const userRoles = user?.roles;
    const [moreOpen, setMoreOpen] = useState(false);
    const pathname = usePathname();

    const items = useMemo(
        () =>
            NAVIGATION_ITEMS.filter((item) => hasRequiredRole(userRoles, item.requiredRoles)).map(
                (item) => getNavigationForUser(item, userRoles)
            ),
        [userRoles]
    );

    const primaryNames: string[] = [
        "New Rides",
        "Calendar",
        "My Assignments",
        "My Created",
        "Groups",
    ];

    const primaryItems = items.filter(
        (i) => primaryNames.includes(i.name) && i.name !== "Create Ride"
    );

    const dropdownItems = items.filter(
        (i) => i.name !== "Create Ride" && !primaryNames.includes(i.name)
    );

    return (
        <div className={cn("hidden md:flex items-center gap-4 w-full", className)}>
            {primaryItems.map((item, index) => (
                <Link
                    key={item.name + index}
                    href={item.href}
                    className={`inline-flex items-center px-2 pt-1 border-b-2 text-sm font-medium transition-all duration-300 ${
                        isActive(item.href, pathname)
                            ? "border-indigo-500 pb-2 font-semibold shadow-md rounded-md text-gray-900"
                            : "border-transparent hover:pb-2 text-gray-500 hover:border-gray-300 hover:text-gray-700 hover:shadow-md hover:rounded-md"
                    }`}
                >
                    {renderNavLabel(item)}
                </Link>
            ))}

            {dropdownItems.length > 0 && (
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => {
                            setMoreOpen((prev) => !prev);
                        }}
                        className={`inline-flex items-center gap-1 px-2 pt-1 border-b-2 text-sm font-medium transition-all duration-300 ${
                            dropdownItems.some((d) => isActive(d.href, pathname))
                                ? "border-indigo-500 pb-2 font-semibold shadow-md rounded-md text-gray-900"
                                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 hover:shadow-md hover:rounded-md"
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
                                            isActive(item.href, pathname)
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

            <UserMenu user={user} className="ml-auto" />
        </div>
    );
}
