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
    ListFilter
} from "lucide-react";

import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import { useGroups } from "@/stores/groups";
import {formatGroupType, Group, GroupType} from "@/types/group";
import { GROUP_TYPE_OPTIONS } from "@/types/group";
import GroupCard from "@/components/ui/group/GroupCard";

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
                                    Organise drivers and rides into private groups. Membership is
                                    invite-only.
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

                            {/* Summary row */}
                            <div className="flex items-center justify-between text-xs text-gray-500 px-0.5">
                                <span>{total} groups</span>
                                {Boolean(
                                    filters.q || filters.city || filters.type,
                                ) && (
                                    <button
                                        type="button"
                                        className="text-[11px] font-medium text-indigo-600 hover:underline"
                                        onClick={() =>
                                            setFilters(INITIAL_FILTERS)
                                        }
                                    >
                                        Clear filters
                                    </button>
                                )}
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
