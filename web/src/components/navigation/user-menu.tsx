"use client";
import { useAuthStore } from "@/stores";
import { User } from "@/types/user";
import { cn } from "@/utils/css";
import { LogOut, UserIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function UserMenu({ user, className }: { user: User; className?: string }) {
    const pathname = usePathname();
    const { logout } = useAuthStore();
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    return (
        <div className={cn("relative", className)}>
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
                <div className="absolute right-0 mt-2 w-48 rounded-md bg-white shadow-lg border border-gray-100 z-1110">
                    <div className="py-1">
                        <Link
                            href="/account"
                            onClick={() => setUserMenuOpen(false)}
                            className={`block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 ${
                                pathname === "/account" ? "bg-indigo-50 text-indigo-700" : ""
                            } inline-flex items-center gap-2 w-full`}
                        >
                            <UserIcon className="h-4 w-4" />
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
    );
}
