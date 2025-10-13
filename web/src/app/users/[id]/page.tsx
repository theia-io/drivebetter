// app/users/[id]/page.tsx
"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {useMemo, useState, useEffect} from "react";
import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import {
    ArrowLeft,
    PencilLine,
    Trash2,
    Users,
    CircleUser,
    Car,
    GaugeCircle,
    ChevronDown,
    ChevronRight, Settings, Languages
} from "lucide-react";
import { useUser, deleteUser } from "@/stores/users";
import {useDriverDetailsByUser} from "@/stores/driver-details";
import {arr, KV, num, Section, bool} from "@/components/ui/commmon";

const dt = (iso?: string) => (iso ? new Date(iso).toLocaleString() : "—");

export default function UserDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { data: user, isLoading, mutate } = useUser(id);

    const isDriver = useMemo(() => (user?.roles || []).includes("driver"), [user]);

    const [showDriver, setShowDriver] = useState(false);
    const {
        data: dd,
        isLoading: ddLoading,
        mutate: mutateDD,
    } = useDriverDetailsByUser(showDriver && isDriver ? id : undefined);

    useEffect(() => {
        if (isDriver) setShowDriver(true);
    }, [isDriver]);

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
                                    <KV k="Name" v={user?.name} />
                                    <KV k="Email" v={user?.email} />
                                    <KV k="Phone" v={user?.phone || "—"} />
                                    <div>
                                        <div className="text-sm text-gray-500">Roles</div>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {(user?.roles || []).map((r) => (
                                                <span
                                                    key={r}
                                                    className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-700"
                                                >{r}</span>
                                            ))}
                                            {!user?.roles?.length && <span className="text-sm text-gray-700">—</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <KV k="Created" v={dt(user?.createdAt)} />
                                    <KV k="Updated" v={dt(user?.updatedAt)} />
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                    {isDriver && (
                        <Card variant="elevated">
                            <CardBody className="p-4 sm:p-6">
                                <button
                                    type="button"
                                    onClick={() => setShowDriver((v) => !v)}
                                    className="w-full flex items-center justify-between text-left"
                                >
                                    <div className="flex items-center gap-2">
                                        <CircleUser className="w-4 h-4 text-gray-600" />
                                        <Typography className="font-semibold text-gray-900">Driver Details</Typography>
                                        <span className="text-xs text-gray-500">
                      {ddLoading ? "Loading…" : dd ? "" : "(no profile yet)"}
                    </span>
                                    </div>
                                    {showDriver ? (
                                        <ChevronDown className="w-4 h-4 text-gray-500" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4 text-gray-500" />
                                    )}
                                </button>

                                {showDriver && (
                                    <div className="mt-4 space-y-4">
                                        {/* If no profile */}
                                        {!dd && !ddLoading && (
                                            <div className="flex items-center justify-between rounded-lg border border-dashed border-gray-300 p-4">
                                                <div className="text-sm text-gray-700">
                                                    This user doesn’t have driver details yet.
                                                </div>
                                                <Link href={`/driver-details/by-user/${id}/edit`}>
                                                    <Button size="sm">Create Driver Profile</Button>
                                                </Link>
                                            </div>
                                        )}

                                        {/* Compact summary when present */}
                                        {dd && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                                <Section title="Vehicle" icon={<Car className="w-4 h-4" />}>
                                                    <KV k="Make" v={dd.vehicle?.make} />
                                                    <KV k="Model" v={dd.vehicle?.model} />
                                                    <KV k="Year" v={num(dd.vehicle?.year)} />
                                                    <KV k="Type" v={dd.vehicle?.type} />
                                                    <KV k="Plate" v={dd.vehicle?.plate} />
                                                </Section>

                                                <Section title="Capacity" icon={<GaugeCircle className="w-4 h-4" />}>
                                                    <KV k="Seats" v={num(dd.capacity?.seatsTotal)} />
                                                    <KV k="Max Pax" v={num(dd.capacity?.maxPassengers)} />
                                                    <KV k="Luggage (L)" v={num(dd.capacity?.luggageCapacity)} />
                                                </Section>

                                                <Section title="Features" icon={<Settings className="w-4 h-4" />}>
                                                    <KV k="Pet Friendly" v={bool(dd.features?.petFriendly)} />
                                                    <KV k="Baby Seat" v={bool(dd.features?.babySeat)} />
                                                    <KV k="Wheelchair" v={bool(dd.features?.wheelchairAccessible)} />
                                                </Section>

                                                <Section title="Languages" icon={<Languages className="w-4 h-4" />}>
                                                    <KV k="Primary" v={dd.languages?.primary} />
                                                    <KV k="Other" v={arr(dd.languages?.list)} />
                                                </Section>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2">
                                            <Link href={`/driver-details/by-user/${id}`}>
                                                <Button variant="outline" size="sm">Open Full Profile</Button>
                                            </Link>
                                            <Link href={`/driver-details/by-user/${id}/edit`}>
                                                <Button size="sm" variant="outline" leftIcon={<PencilLine className="w-4 h-4" />}>
                                                    Edit
                                                </Button>
                                            </Link>
                                            <Button variant="outline" size="sm" onClick={() => mutateDD()}>
                                                Refresh
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    )}
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