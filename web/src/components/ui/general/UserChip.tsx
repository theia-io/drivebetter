import {useState} from "react";
import {ChevronDown, Users, X} from "lucide-react";
import {useRouter} from "next/navigation";
import Link from "next/link";

type UserChipProps = {
    user: { _id: string; name?: string; email?: string };
    badge?: string;
    badgeColor?: "indigo" | "emerald";
    link?: boolean;
    canRemove?: boolean;
    onRemove?: () => void;
    extraActions?: React.ReactNode;
};

export function UserChip({
                      user,
                      badge,
                      badgeColor = "indigo",
                      link,
                      canRemove,
                      onRemove,
                      extraActions,
                  }: UserChipProps) {
    const displayName = user.name || user.email || `User ${user._id.slice(-6)}`;

    const badgeClass =
        badgeColor === "emerald"
            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
            : "bg-indigo-50 text-indigo-700 border-indigo-100";

    const nameContent = (
        <span className="text-xs font-medium text-gray-900 break-words">
            {displayName}
        </span>
    );

    return (
        <div className="w-full sm:max-w-xs rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs">
            <div className="flex items-start gap-2">
                <Users className="w-3.5 h-3.5 mt-[2px] text-gray-500 shrink-0" />
                <div className="flex-1 min-w-0 space-y-0.5">
                    {link ? (
                        <Link
                            href={`/users/${user._id}`}
                            className="hover:underline break-words"
                        >
                            {nameContent}
                        </Link>
                    ) : (
                        nameContent
                    )}
                    {user.email && (
                        <div className="text-[11px] text-gray-500 break-all">
                            {user.email}
                        </div>
                    )}
                    {extraActions && (
                        <div className="pt-1 border-t border-gray-100">
                            {extraActions}
                        </div>
                    )}
                </div>
                <div className="flex flex-col items-end gap-1 ml-1">
                    {badge && (
                        <span
                            className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] ${badgeClass}`}
                        >
                            {badge}
                        </span>
                    )}
                    {canRemove && onRemove && (
                        <button
                            type="button"
                            className="p-0.5 rounded hover:bg-gray-100"
                            onClick={onRemove}
                            aria-label={`Remove ${displayName}`}
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}