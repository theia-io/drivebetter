"use client";

import Link from "next/link";
import {useDriverByIdPublic} from "@/stores/users";

export default function AssignedDriverBadge({ userId }: { userId?: string }) {
    if (!userId) return <>—</>;

    const { data: data, isLoading: isLoading } = useDriverByIdPublic(userId);

    if (isLoading) return <span className="text-xs text-gray-500">Loading…</span>;
    if (!data) return <>—</>;

    return (
        <Link
            href={`/users/${userId}`}
            className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/20 hover:bg-indigo-100 transition-colors truncate"
            title={data.email}
        >Driver:
            <span className="truncate">{data.name || "View driver"}</span>
            {data.email ? (
                <span className="ml-1 text-gray-600/80">• {data.email}</span>
            ) : null}
        </Link>
    );
}
