"use client";

import Link from "next/link";

export interface RideCreatorUser {
    _id: string;
    name: string;
    email: string;
    phone?: string;
}

export default function RideCreatorBadge({ creator }: { creator?: RideCreatorUser | null }) {
    if (!creator?._id) return <>—</>;

    const label = creator.name || "View creator";
    const subtitle = ""; //creator.email || creator.phone || "";

    return (
        <Link
            href={`/users/${creator._id}`}
            className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold
                 text-slate-800 ring-1 ring-inset ring-slate-300 hover:bg-slate-100 transition-colors truncate"
            title={subtitle || label}
        >
            <span className="truncate">{label}</span>
            {subtitle && (
                <span className="ml-1 text-gray-600/80 truncate max-w-[10rem]">• {subtitle}</span>
            )}
        </Link>
    );
}
