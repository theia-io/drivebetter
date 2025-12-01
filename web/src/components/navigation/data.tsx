import {BookUserIcon, Calendar, Plus, Route, Share2, UserCheck, Users, UsersRound} from "lucide-react";
import { ReactNode } from "react";

export type NavItem = {
    name: string;
    href: string;
    requiredRoles?: string[];
    icon?: ReactNode;
};

export const CREATE_RIDE_ITEM: NavItem = {
    name: "Create Ride",
    href: "/rides/new",
    requiredRoles: ["driver", "dispatcher", "admin"],
    icon: <Plus className="h-4 w-4" />,
};

export const CALENDAR_ITEM: NavItem = {
    name: "Calendar",
    href: "/calendar",
    requiredRoles: ["driver"],
    icon: <Calendar className="h-4 w-4" />,
};

export const MY_CREATED_ITEM: NavItem = {
    name: "My Created",
    href: "/rides",
    requiredRoles: ["driver"],
    icon: <Route className="h-4 w-4" />,
};

export const MY_ASSIGNMENTS_ITEM: NavItem = {
    name: "My Assignments",
    href: "/my-rides",
    requiredRoles: ["driver"],
    icon: <UserCheck className="h-4 w-4" />,
};

export const NEW_RIDES_ITEM: NavItem = {
    name: "New Rides",
    href: "/shared-rides",
    requiredRoles: ["driver"],
    icon: <Share2 className="h-4 w-4" />,
};

export const GROUPS_ITEM: NavItem = {
    name: "Groups",
    href: "/groups",
    requiredRoles: ["driver", "dispatcher", "admin"],
    icon: <Users className="h-4 w-4" />,
};

export const USERS_ITEM: NavItem = {
    name: "Users",
    href: "/users",
    requiredRoles: ["admin", "dispatcher"],
    icon: <UsersRound className="h-4 w-4" />,
};

export const CUSTOMERS_ITEM: NavItem = {
    name: "Customers",
    href: "/customers",
    requiredRoles: ["admin", "dispatcher", "driver"],
    icon: <BookUserIcon className="h-4 w-4" />,
};

export const NAVIGATION_ITEMS: NavItem[] = [
    CALENDAR_ITEM,
    MY_CREATED_ITEM,
    MY_ASSIGNMENTS_ITEM,
    NEW_RIDES_ITEM,
    CUSTOMERS_ITEM,
];

export const getNavigationForUser = (item: NavItem, userRoles?: string[]): NavItem => {
    if (item.name !== "Users") return item;
    const roles = userRoles || [];
    if (roles.includes("admin")) return item;
    if (roles.includes("dispatcher")) {
        return { ...item, name: "Drivers", href: "/users?role=driver" };
    }
    return item;
};

export const hasRequiredRole = (userRoles?: string[], requiredRoles?: string[]): boolean => {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    return Array.isArray(userRoles) && requiredRoles.some((r) => userRoles.includes(r));
};
