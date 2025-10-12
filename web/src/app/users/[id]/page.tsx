// app/users/[id]/page.tsx
"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import { ArrowLeft, PencilLine, Trash2, Users, CircleUser } from "lucide-react";
import { useUser, deleteUser } from "@/stores/users";

const dt = (iso?: string) => (iso ? new Date(iso).toLocaleString() : "—");

export default function UserDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { data: user, isLoading, mutate } = useUser(id);

    const isDriver = useMemo(() => (user?.roles || []).includes("driver"), [user]);

    async function onDelete() {
        const ok = confirm("Delete this user?");
        if (!ok) return;
        await deleteUser(id);
        router.push("/users");
    }

    return (
        <ProtectedLayout>
            <Container className="px-3 sm:px-6 lg:px-8">
                <div className="space-y-4 sm:space-y-6">
                    {/* Toolbar */}
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<ArrowLeft className="w-4 h-4" />}
                                onClick={() => router.push("/users")}
                            >
                                Back
                            </Button>
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-200">
                                    <Users className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div className="min-w-0">
                                    <Typography className="text-xs text-gray-500">User</Typography>
                                    <Typography
                                        variant="h1"
                                        className="text-base sm:text-2xl font-bold text-gray-900 whitespace-normal break-words hyphens-auto leading-tight"
                                    >
                                        {isLoading ? "Loading…" : user?.name || "—"}
                                    </Typography>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link href={`/users/${id}/edit`}>
                                <Button variant="outline" size="sm" leftIcon={<PencilLine className="w-4 h-4" />}>
                                    Edit
                                </Button>
                            </Link>
                            <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<Trash2 className="w-4 h-4" />}
                                onClick={onDelete}
                                disabled={isLoading || !user}
                            >
                                Delete
                            </Button>
                        </div>
                    </div>

                    {/* Summary */}
                    <Card variant="elevated">
                        <CardBody className="p-4 sm:p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <div className="space-y-3">
                                    <KV label="Name" value={user?.name} />
                                    <KV label="Email" value={user?.email} copy />
                                    <KV label="Phone" value={user?.phone || "—"} />
                                    <div>
                                        <div className="text-sm text-gray-500">Roles</div>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {(user?.roles || []).map((r) => (
                                                <span
                                                    key={r}
                                                    className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-700"
                                                >
                          {r}
                        </span>
                                            ))}
                                            {!user?.roles?.length && <span className="text-sm text-gray-700">—</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <KV label="Created" value={dt(user?.createdAt)} />
                                    <KV label="Updated" value={dt(user?.updatedAt)} />
                                    <div className="mt-2">
                                        {isDriver ? (
                                            <Link href={`/driver-details/by-user/${id}`}>
                                                <Button size="sm" leftIcon={<CircleUser className="w-4 h-4" />}>
                                                    Driver Details
                                                </Button>
                                            </Link>
                                        ) : (
                                            <div className="text-sm text-gray-500">Not a driver</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <Link href={`/rides?driverId=${id}`}>
                            <Button variant="outline" size="sm">View Driver’s Rides</Button>
                        </Link>
                        <Button variant="outline" size="sm" onClick={() => mutate()}>Refresh</Button>
                    </div>
                </div>
            </Container>
        </ProtectedLayout>
    );
}

/* ----------------------------- Small KV ----------------------------- */
function KV({ label, value, copy = false }: { label: string; value?: string; copy?: boolean }) {
    return (
        <div className="text-sm">
            <div className="text-gray-500">{label}</div>
            <div className="mt-0.5 font-medium text-gray-900 break-words">
                {value ?? "—"}
                {copy && value ? (
                    <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(value)}
                        className="ml-2 text-xs text-indigo-600 underline"
                    >
                        Copy
                    </button>
                ) : null}
            </div>
        </div>
    );
}
