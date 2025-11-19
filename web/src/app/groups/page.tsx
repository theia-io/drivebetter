"use client";

import useSWR from "swr";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography, Badge } from "@/components/ui";
import { Users, Plus, Search, Trash2, PencilLine, Eye } from "lucide-react";
import { apiGet, apiDelete } from "@/services/http";
import { Group, PageResp } from "@/types";
import { useGroups } from "@/stores/groups";

/* ----------------------------- Helpers ----------------------------- */
const qstring = (params: Record<string, any>) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") return;
        sp.set(k, String(v));
    });
    const s = sp.toString();
    return s ? `?${s}` : "";
};

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <th
            scope="col"
            className={`px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider ${className}`}
        >
            {children}
        </th>
    );
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <td className={`px-4 py-3 text-sm text-gray-900 ${className}`}>{children}</td>;
}

export default function GroupsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [q, setQ] = useState(searchParams.get("q") || "");
    const [type, setType] = useState(searchParams.get("type") || "");
    const [active, setActive] = useState(searchParams.get("active") || "");
    const [page, setPage] = useState(Number(searchParams.get("page") || 1));
    const [limit, setLimit] = useState(Number(searchParams.get("limit") || 20));

    const { data, isLoading, mutate } = useGroups({ q: q, type: type, page: page, limit: limit });

    const items = data?.items ?? [];
    const pages = data?.pages ?? 1;
    const total = data?.total ?? 0;

    async function onDelete(id: string) {
        if (!confirm("Delete this group?")) return;
        await apiDelete(`/groups/${id}`);
        await mutate();
    }

    function applyFilters() {
        const s = qstring({ q, type, active, page: 1, limit });
        router.replace(`/groups${s}`);
        setPage(1);
        mutate();
    }

    return (
        <ProtectedLayout>
            <Container className="px-4 sm:px-6 lg:px-8">
                <div className="space-y-6 sm:space-y-8">
                    {/* Header */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-200">
                                <Users className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div className="min-w-0">
                                <Typography
                                    variant="h1"
                                    className="text-xl sm:text-3xl font-bold text-gray-900"
                                >
                                    Groups
                                </Typography>
                                <Typography variant="body1" className="text-gray-600 text-sm">
                                    {isLoading ? "Loading…" : `${total} total`}
                                </Typography>
                            </div>
                        </div>
                        <div>
                            <Button leftIcon={<Plus className="w-4 h-4" />}>
                                <Link href="/groups/new">New Group</Link>
                            </Button>
                        </div>
                    </div>

                    {/* Filters */}
                    <Card variant="elevated">
                        <CardBody className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        value={q}
                                        onChange={(e) => setQ(e.target.value)}
                                        placeholder="Search by group name/city"
                                        className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    />
                                </div>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="w-full sm:w-48 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                >
                                    <option value="">All types</option>
                                    <option value="local">local</option>
                                    <option value="corporate">corporate</option>
                                    <option value="global">global</option>
                                </select>
                                <select
                                    value={active}
                                    onChange={(e) => setActive(e.target.value)}
                                    className="w-full sm:w-40 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                >
                                    <option value="">All states</option>
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>
                                <select
                                    value={limit}
                                    onChange={(e) => setLimit(Number(e.target.value))}
                                    className="w-full sm:w-32 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                >
                                    {[10, 20, 50, 100].map((n) => (
                                        <option key={n} value={n}>
                                            {n}/page
                                        </option>
                                    ))}
                                </select>
                                <Button variant="outline" onClick={applyFilters}>
                                    Apply
                                </Button>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Table (desktop) */}
                    <div className="hidden md:block">
                        <div className="overflow-hidden rounded-lg border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200 bg-white">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <Th>Name</Th>
                                        <Th>Type</Th>
                                        <Th>City</Th>
                                        <Th>Members</Th>
                                        <Th>Active</Th>
                                        <Th className="text-right pr-4">Actions</Th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {items.map((g) => (
                                        <tr key={g._id} className="hover:bg-gray-50">
                                            <Td className="font-medium">{g.name}</Td>
                                            <Td className="capitalize">{g.type}</Td>
                                            <Td>{g.city || "—"}</Td>
                                            <Td>
                                                {typeof g.membersCount === "number"
                                                    ? g.membersCount
                                                    : (g.members?.length ?? 0)}
                                            </Td>
                                            <Td>{g.isActive === false ? "No" : "Yes"}</Td>
                                            <Td className="text-right">
                                                <div className="flex items-center justify-end gap-2 pr-1">
                                                    <Link href={`/groups/${g._id}`}>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            leftIcon={<Eye className="w-4 h-4" />}
                                                        >
                                                            Details
                                                        </Button>
                                                    </Link>
                                                    <Link href={`/groups/${g._id}/edit`}>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            leftIcon={
                                                                <PencilLine className="w-4 h-4" />
                                                            }
                                                        >
                                                            Edit
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        leftIcon={<Trash2 className="w-4 h-4" />}
                                                        onClick={() => onDelete(g._id)}
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            </Td>
                                        </tr>
                                    ))}
                                    {!items.length && (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="p-6 text-center text-sm text-gray-600"
                                            >
                                                No groups
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Cards (mobile) */}
                    <div className="grid md:hidden grid-cols-1 gap-3">
                        {items.map((g) => (
                            <Card
                                key={g._id}
                                variant="elevated"
                                className="hover:shadow-lg transition-shadow"
                            >
                                <CardBody className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="font-semibold text-gray-900">
                                                {g.name}
                                            </div>
                                            <div className="text-sm text-gray-700">
                                                {g.city || "—"} • {g.type}
                                            </div>
                                            <div className="text-xs text-gray-600 mt-1">
                                                Members:{" "}
                                                {typeof g.membersCount === "number"
                                                    ? g.membersCount
                                                    : (g.members?.length ?? 0)}{" "}
                                                • {g.isActive === false ? "Inactive" : "Active"}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <Link href={`/groups/${g._id}`}>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    leftIcon={<Eye className="w-4 h-4" />}
                                                >
                                                    View
                                                </Button>
                                            </Link>
                                            <Link href={`/groups/${g._id}/edit`}>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    leftIcon={<PencilLine className="w-4 h-4" />}
                                                >
                                                    Edit
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                leftIcon={<Trash2 className="w-4 h-4" />}
                                                onClick={() => onDelete(g._id)}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        ))}
                        {!items.length && (
                            <div className="p-6 text-center text-sm text-gray-600">No groups</div>
                        )}
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            Page {page} / {pages}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const p = Math.max(1, page - 1);
                                    setPage(p);
                                    router.replace(
                                        `/groups${qstring({ q, type, active, page: p, limit })}`
                                    );
                                    mutate();
                                }}
                                disabled={page <= 1 || isLoading}
                            >
                                Prev
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const p = Math.min(pages, page + 1);
                                    setPage(p);
                                    router.replace(
                                        `/groups${qstring({ q, type, active, page: p, limit })}`
                                    );
                                    mutate();
                                }}
                                disabled={page >= pages || isLoading}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            </Container>
        </ProtectedLayout>
    );
}
