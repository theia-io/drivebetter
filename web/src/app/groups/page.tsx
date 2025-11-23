// app/groups/page.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Search,
    Users,
    Plus,
    Loader2,
    MapPin,
    ListFilter,
    Tag,
    Lock,
} from "lucide-react";

import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import { useGroups } from "@/stores/groups";
import type { Group, GroupType } from "@/types/group";
import { GROUP_TYPE_OPTIONS } from "@/types/group";

type FilterState = {
    q: string;
    type: GroupType | "";
    city: string;
};

const INITIAL_FILTERS: FilterState = {
    q: "",
    type: "",
    city: "",
};

export default function GroupsPage() {
    const router = useRouter();
    const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

    const queryParams = useMemo(
        () => ({
            q: filters.q.trim() || undefined,
            type: filters.type || undefined,
            city: filters.city.trim() || undefined,
        }),
        [filters],
    );

    const { data, error } = useGroups(queryParams);
    const loading = !data && !error;

    const groups = data?.items ?? [];
    const total = data?.total ?? 0;

    const onFilterChange = <K extends keyof FilterState>(
        key: K,
        value: FilterState[K],
    ) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <ProtectedLayout>
            <Container className="px-3 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-6xl py-4 sm:py-6 space-y-4 sm:space-y-6">
                    {/* Header */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-2.5">
                                <Users className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div className="space-y-0.5">
                                <Typography className="text-xl sm:text-2xl font-bold text-gray-900">
                                    Groups
                                </Typography>
                                <p className="text-xs sm:text-sm text-gray-500">
                                    Organise drivers and rides into private groups. Membership is invite-only.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push("/groups/new")}
                                className="sm:hidden"
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                New
                            </Button>
                            <Button
                                variant="solid"
                                size="sm"
                                className="hidden sm:inline-flex"
                                onClick={() => router.push("/groups/new")}
                                leftIcon={<Plus className="h-4 w-4" />}
                            >
                                New group
                            </Button>
                        </div>
                    </div>

                    {/* Filters */}
                    <Card>
                        <CardBody className="p-3 sm:p-4 space-y-3">
                            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                <ListFilter className="h-4 w-4" />
                                <span>Filters</span>
                            </div>

                            <div className="flex flex-col gap-3 sm:grid sm:grid-cols-3">
                                {/* Search */}
                                <div className="flex flex-col gap-1.5">
                                    <label
                                        htmlFor="q"
                                        className="text-xs font-medium text-gray-600"
                                    >
                                        Search
                                    </label>
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                        <input
                                            id="q"
                                            value={filters.q}
                                            onChange={(e) =>
                                                onFilterChange("q", e.target.value)
                                            }
                                            className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="Search by name or description…"
                                        />
                                    </div>
                                </div>

                                {/* Type */}
                                <div className="flex flex-col gap-1.5">
                                    <label
                                        htmlFor="type"
                                        className="text-xs font-medium text-gray-600"
                                    >
                                        Type
                                    </label>
                                    <select
                                        id="type"
                                        value={filters.type}
                                        onChange={(e) =>
                                            onFilterChange(
                                                "type",
                                                e.target.value as GroupType | "",
                                            )
                                        }
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="">All types</option>
                                        {GROUP_TYPE_OPTIONS.map((t) => (
                                            <option key={t} value={t}>
                                                {formatGroupType(t as GroupType)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* City */}
                                <div className="flex flex-col gap-1.5">
                                    <label
                                        htmlFor="city"
                                        className="text-xs font-medium text-gray-600"
                                    >
                                        City
                                    </label>
                                    <div className="relative">
                                        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                        <input
                                            id="city"
                                            value={filters.city}
                                            onChange={(e) =>
                                                onFilterChange("city", e.target.value)
                                            }
                                            className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="Filter by city"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Content */}
                    {loading && (
                        <div className="flex items-center justify-center py-10 text-gray-500">
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            <span className="text-sm">Loading groups…</span>
                        </div>
                    )}

                    {error && !loading && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            Failed to load groups.
                        </div>
                    )}

                    {!loading && !error && (
                        <>
                            {groups.length === 0 ? (
                                <Card>
                                    <CardBody className="p-6 text-center space-y-2">
                                        <p className="text-sm font-medium text-gray-800">
                                            No groups found
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Adjust filters or create a new group.
                                        </p>
                                        <div className="pt-2">
                                            <Link href="/groups/new">
                                                <Button
                                                    size="sm"
                                                    leftIcon={<Plus className="h-4 w-4" />}
                                                >
                                                    Create group
                                                </Button>
                                            </Link>
                                        </div>
                                    </CardBody>
                                </Card>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs text-gray-500 px-0.5">
                                        <span>{total} groups</span>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        {groups.map((g) => (
                                            <GroupCard key={g._id} group={g} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </Container>
        </ProtectedLayout>
    );
}

/* ------------------------------------------------------------------ */
/* Card                                                               */
/* ------------------------------------------------------------------ */

function GroupCard({ group }: { group: Group }) {
    const membersCount =
        typeof group.membersCount === "number"
            ? group.membersCount
            : group.members?.length ?? 0;

    const tags = Array.isArray(group.tags) ? group.tags : [];
    const shownTags = tags.slice(0, 3);
    const extraTags = tags.length - shownTags.length;

    const hasRidesStats =
        typeof group.activeRides === "number" ||
        typeof group.totalRides === "number";

    return (
        <Card className="h-full flex flex-col">
            <CardBody className="p-4 sm:p-5 flex flex-col gap-3">
                {/* Title + description */}
                <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                        <Link
                            href={`/groups/${group._id}`}
                            className="text-sm sm:text-base font-semibold text-gray-900 hover:underline break-words"
                        >
                            {group.name}
                        </Link>
                        {group.description && (
                            <p className="text-xs sm:text-sm text-gray-500 line-clamp-2">
                                {group.description}
                            </p>
                        )}
                    </div>
                </div>

                {/* Meta pills: type, city, visibility, invite-only */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs">
                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700 border border-indigo-100">
                        {formatGroupType(group.type)}
                    </span>

                    {group.city && (
                        <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-gray-600 border border-gray-100">
                            <MapPin className="h-3 w-3 mr-1" />
                            {group.city}
                        </span>
                    )}

                    {group.visibility && (
                        <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-gray-600 border border-gray-100">
                            {group.visibility}
                        </span>
                    )}

                    {group.isInviteOnly && (
                        <span className="inline-flex items-center rounded-full bg-gray-900 px-2 py-0.5 text-gray-100 border border-gray-900">
                            <Lock className="h-3 w-3 mr-1" />
                            invite-only
                        </span>
                    )}

                    {group.isActive !== undefined && (
                        <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 border ${
                                group.isActive
                                    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                                    : "border-gray-200 bg-gray-50 text-gray-500"
                            }`}
                        >
                            {group.isActive ? "Active" : "Inactive"}
                        </span>
                    )}
                </div>

                {/* Tags */}
                {tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs">
                        <span className="inline-flex items-center text-gray-500">
                            <Tag className="h-3 w-3 mr-1" />
                            Tags:
                        </span>
                        {shownTags.map((t) => (
                            <span
                                key={t}
                                className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-gray-700"
                            >
                                #{t}
                            </span>
                        ))}
                        {extraTags > 0 && (
                            <span className="text-gray-500">+{extraTags} more</span>
                        )}
                    </div>
                )}

                {/* Stats row */}
                <div className="mt-1 flex items-center justify-between text-[11px] sm:text-xs text-gray-500">
                    <div className="inline-flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        <span>{membersCount} members</span>
                    </div>

                    {hasRidesStats && (
                        <div className="inline-flex items-center gap-2">
                            {typeof group.activeRides === "number" && (
                                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 border border-amber-100">
                                    {group.activeRides} active
                                </span>
                            )}
                            {typeof group.totalRides === "number" && (
                                <span>{group.totalRides} total rides</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="pt-2 flex justify-end">
                    <Link href={`/groups/${group._id}`}>
                        <Button variant="outline" size="sm">
                            Open
                        </Button>
                    </Link>
                </div>
            </CardBody>
        </Card>
    );
}

/* ------------------------------------------------------------------ */

function formatGroupType(t: GroupType | undefined): string {
    if (!t) return "Custom";
    switch (t) {
        case "fleet":
            return "Fleet";
        case "coop":
            return "Co-op";
        case "airport":
            return "Airport";
        case "city":
            return "City";
        case "custom":
            return "Custom";
        case "global":
            return "Global";
        default:
            return t;
    }
}
