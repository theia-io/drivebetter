// app/users/page.tsx
"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import { Plus, Search, Users, Trash2, PencilLine, Eye } from "lucide-react";
import { useUsers, deleteUser } from "@/stores/users";
import { useAuthStore } from "@/stores";

const qstring = (params: Record<string, any>) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") return;
        sp.set(k, String(v));
    });
    const s = sp.toString();
    return s ? `?${s}` : "";
};

function UsersPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuthStore();
    const userRoles = user?.roles || [];
    const isAdmin = userRoles.includes("admin");
    const isDispatcher = userRoles.includes("dispatcher");

    // Define the role that should be forced in the query
    // If Admin, forcedRole is null. If Dispatcher, forcedRole is 'driver'.
    const forcedRole = isAdmin ? null : isDispatcher ? "driver" : null;

    const [q, setQ] = useState(searchParams.get("q") || "");
    const [role, setRole] = useState(isAdmin ? searchParams.get("role") || "" : forcedRole || "");
    const [page, setPage] = useState(Number(searchParams.get("page") || 1));
    const [limit, setLimit] = useState(Number(searchParams.get("limit") || 20));

    const params = useMemo(() => ({ q, role, page, limit }), [q, role, page, limit]);
    const { data, isLoading, mutate } = useUsers(params);
    const items = data?.items ?? [];
    const pages = data?.pages ?? 1;
    const total = data?.total ?? 0;

    async function onDelete(id: string) {
        // eslint-disable-next-line no-alert
        const ok = confirm("Delete this user?");
        if (!ok) return;
        await deleteUser(id);
        await mutate();
    }

    function applyFilters() {
        const effectiveRole = isAdmin ? role : forcedRole;
        const s = qstring({ q, role: effectiveRole, page: 1, limit });
        router.replace(`/users${s}`);
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
                                    {isAdmin ? "Users" : isDispatcher ? "Drivers" : "Users"}
                                </Typography>
                                <Typography variant="body1" className="text-gray-600 text-sm">
                                    {isLoading ? "Loading…" : `${total} total`}
                                </Typography>
                            </div>
                        </div>
                        {isAdmin && (
                            <div>
                                <Button leftIcon={<Plus className="w-4 h-4" />}>
                                    <Link href="/users/new">New User</Link>
                                </Button>
                            </div>
                        )}
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
                                        placeholder="Search name or email"
                                        className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    />
                                </div>
                                {isAdmin && (
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        className="w-full sm:w-52 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    >
                                        <option value="">All roles</option>
                                        <option value="driver">driver</option>
                                        <option value="dispatcher">dispatcher</option>
                                        <option value="customer">client</option>
                                        <option value="admin">admin</option>
                                    </select>
                                )}
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

                    {/* Table (desktop) / Cards (mobile) */}
                    <div className="hidden md:block">
                        <div className="overflow-hidden rounded-lg border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200 bg-white">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <Th>Name</Th>
                                        <Th>Email</Th>
                                        <Th>Phone</Th>
                                        <Th>Roles</Th>
                                        <Th>Created</Th>
                                        <Th className="text-center pr-4">Actions</Th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {items.map((u) => (
                                        <tr key={u._id} className="hover:bg-gray-50">
                                            <Td>{u.name}</Td>
                                            <Td className="text-gray-700">{u.email}</Td>
                                            <Td className="text-gray-700">{u.phone || "—"}</Td>
                                            <Td>
                                                <div className="flex flex-wrap gap-1">
                                                    {u.roles.map((r) => (
                                                        <span
                                                            key={r}
                                                            className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-700"
                                                        >
                                                            {r}
                                                        </span>
                                                    ))}
                                                </div>
                                            </Td>
                                            <Td>
                                                {u.createdAt
                                                    ? new Date(u.createdAt).toLocaleDateString()
                                                    : "—"}
                                            </Td>
                                            <Td className="text-right">
                                                <div className="flex items-center justify-end gap-2 pr-1">
                                                    <Link href={`/users/${u._id}`}>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            leftIcon={<Eye className="w-4 h-4" />}
                                                        >
                                                            Details
                                                        </Button>
                                                    </Link>
                                                    {isAdmin && (
                                                        <>
                                                            <Link href={`/users/${u._id}/edit`}>
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
                                                                leftIcon={
                                                                    <Trash2 className="w-4 h-4" />
                                                                }
                                                                onClick={() => onDelete(u._id)}
                                                            >
                                                                Delete
                                                            </Button>
                                                        </>
                                                    )}
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
                                                No users
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Cards for mobile */}
                    <div className="grid md:hidden grid-cols-1 gap-3">
                        {items.map((u) => (
                            <Card
                                key={u._id}
                                variant="elevated"
                                className="hover:shadow-lg transition-shadow"
                            >
                                <CardBody className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="font-semibold text-gray-900">
                                                {u.name}
                                            </div>
                                            <div className="text-sm text-gray-700 break-all">
                                                {u.email}
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                {u.phone || "—"}
                                            </div>
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {u.roles.map((r) => (
                                                    <span
                                                        key={r}
                                                        className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-700"
                                                    >
                                                        {r}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="mt-1 text-xs text-gray-500">
                                                {u.createdAt
                                                    ? new Date(u.createdAt).toLocaleDateString()
                                                    : "—"}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <Link href={`/users/${u._id}`}>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    leftIcon={<Eye className="w-4 h-4" />}
                                                >
                                                    View
                                                </Button>
                                            </Link>
                                            <Link href={`/users/${u._id}/edit`}>
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
                                                onClick={() => onDelete(u._id)}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        ))}
                        {!items.length && (
                            <div className="p-6 text-center text-sm text-gray-600">No users</div>
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
                                    const next = Math.max(1, page - 1);
                                    setPage(next);
                                    router.replace(
                                        `/users${qstring({ q, role, page: next, limit })}`
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
                                    const next = Math.min(pages, page + 1);
                                    setPage(next);
                                    router.replace(
                                        `/users${qstring({ q, role, page: next, limit })}`
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

/* ----------------------------- Table cells ----------------------------- */
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

export default function UsersPage() {
    return (
        <Suspense fallback={
            <ProtectedLayout>
                <Container className="px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-center py-12">
                        <div className="text-gray-600">Loading...</div>
                    </div>
                </Container>
            </ProtectedLayout>
        }>
            <UsersPageContent />
        </Suspense>
    );
}
