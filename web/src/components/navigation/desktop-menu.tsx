import { Button } from "@/components/ui";
import { useWindowSize } from "@/hooks/useWindowSize";
import { User } from "@/types";
import { cn } from "@/utils/css";
import { MoreHorizontal, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import {
    CREATE_RIDE_ITEM,
    GROUPS_ITEM,
    NAVIGATION_ITEMS,
    NavItem,
    USERS_ITEM,
    getNavigationForUser,
    hasRequiredRole,
} from "./data";
import { isActive } from "./is-active";
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
    const { width } = useWindowSize();

    const items = useMemo(
        () =>
            NAVIGATION_ITEMS.filter((item) => hasRequiredRole(userRoles, item.requiredRoles)).map(
                (item) => getNavigationForUser(item, userRoles)
            ),
        [userRoles]
    );

    const primaryItems = items.slice(0, width < 1024 ? 1 : undefined);

    const dropdownItems = items
        .concat([GROUPS_ITEM, USERS_ITEM])
        .filter((item) => !primaryItems.some(({ name }) => name === item.name));

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
                                : "border-transparent hover:pb-2 text-gray-500 hover:border-gray-300 hover:text-gray-700 hover:shadow-md hover:rounded-md"
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

            <div className="ml-auto flex items-center gap-2">
                <Link href={CREATE_RIDE_ITEM.href}>
                    <Button
                        variant="solid"
                        size="sm"
                        className="flex items-center w-full bg-emerald-600 hover:bg-emerald-700 border border-emerald-600 text-white shadow-sm"
                    >
                        <Plus size={24} />
                        <span className="xl:hidden">Ride</span>
                        <span className="hidden xl:block">Create ride</span>
                    </Button>
                </Link>

                <UserMenu user={user} />
            </div>
        </div>
    );
}
