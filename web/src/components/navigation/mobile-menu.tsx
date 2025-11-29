import { Button } from "@/components/ui";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import { User } from "@/types/user";
import { cn } from "@/utils/css";
import { LogOut, Menu, Plus, UserIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import AppVersion from "../meta-info/app-version";
import {
    CREATE_RIDE_ITEM,
    getNavigationForUser,
    GROUPS_ITEM,
    hasRequiredRole,
    NAVIGATION_ITEMS,
    NavItem,
    USERS_ITEM,
} from "./data";
import { isActive } from "./is-active";

interface MobileMenuProps {
    renderNavLabel: (item: NavItem) => React.ReactNode;
    user: User;
    logout: () => void;
    className?: string;
}

export default function MobileMenu({ renderNavLabel, user, logout, className }: MobileMenuProps) {
    const pathname = usePathname();
    const userRoles = user?.roles;

    const mobileItems = useMemo(() => {
        return NAVIGATION_ITEMS.concat([GROUPS_ITEM, USERS_ITEM])
            .filter((item) => hasRequiredRole(userRoles, item.requiredRoles))
            .map((item) => getNavigationForUser(item, userRoles));
    }, [userRoles]);

    return (
        <div className={cn("md:hidden", className)}>
            <Drawer>
                <DrawerTrigger>
                    <Menu className="h-5 w-5" />
                </DrawerTrigger>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>DriveBetter</DrawerTitle>
                        <DrawerDescription>
                            Driver management system for DriveBetter.
                        </DrawerDescription>
                    </DrawerHeader>

                    {/* Create ride primary button (same style as desktop, full width) */}

                    <div className="px-4 pt-3 pb-2">
                        <Link href={CREATE_RIDE_ITEM.href}>
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

                    {/* Other nav items */}
                    <div className="pt-1 pb-3 space-y-1">
                        {mobileItems.map((item) => {
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center justify-between pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                                        isActive(item.href, pathname)
                                            ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                                            : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                                    }`}
                                >
                                    <span className="inline-flex items-center gap-2">
                                        {renderNavLabel(item)}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>

                    <DrawerFooter>
                        <div className="flex items-center justify-center gap-2">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                                <UserIcon className="h-4 w-4" />
                            </span>
                            <Link
                                href="/account"
                                className="block text-sm font-medium text-gray-900 hover:underline"
                            >
                                {user?.name || "Account"}
                            </Link>
                        </div>

                        <hr className="my-2 border-gray-200" />

                        <DrawerClose>
                            <Button
                                onClick={() => {
                                    logout();
                                }}
                                className="flex items-center gap-2"
                                variant="outline"
                            >
                                <LogOut className="h-4 w-4" />
                                <span>Logout</span>
                            </Button>
                        </DrawerClose>
                    </DrawerFooter>

                    <AppVersion className="justify-center" />
                </DrawerContent>
            </Drawer>
        </div>
    );
}
