"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import {
    ArrowLeft,
    Calendar,
    Clock, Copy,
    DollarSign, Link2,
    MapPin,
    Navigation,
    PhoneIcon,
    Share2,
    Trash2,
    User,
    UserIcon,
    Users
} from "lucide-react";
import Link from "next/link";

import LeafletMap from "@/components/ui/maps/LeafletMap";
import {Ride} from "@/types";
import { useRide, useSetRideStatus, useDeleteRide } from "@/stores/rides";
import {useUser, useDriversPublicBatchMap} from "@/stores/users";
import { getRoute } from "@/stores/routes";
import {useAuthStore} from "@/stores";
import { useGroups } from "@/stores/groups";
import {useRevokeRideShare, useRideShares} from "@/stores/rideShares";

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString();
const money = (cents?: number) => (typeof cents === "number" ? `$${(cents / 100).toFixed(2)}` : "—");
const km = (m?: number) => (m ? `${(m / 1000).toFixed(1)} km` : "—");
const mins = (m?: number) => (m ? `${m} min` : "—");

const STATUS: Ride["status"][] = ["unassigned","assigned","on_my_way","on_location","pob","clear","completed"];

export default function RideDetailsPage() {
    const { user } = useAuthStore();
    const canShare = user?.roles?.some((r) => r === "admin" || r === "dispatcher");
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { data: ride, mutate } = useRide(id);
    const { setRideStatus, isSettingStatus } = useSetRideStatus(id);
    const { deleteRide, isDeleting } = useDeleteRide(id);
    const { data: shares = [], isLoading: sharesLoading, mutate: mutateShares } = useRideShares(id);
    const assignedDriverId = ride?.assignedDriverId;
    const { data: driver } = useUser(assignedDriverId);

    const [routeLine, setRouteLine] = useState<[number, number][]>([]);
    const [revokingId, setRevokingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const hasA = !!ride?.fromLocation?.coordinates?.length;
    const hasB = !!ride?.toLocation?.coordinates?.length;

    const { data: groupsData } = useGroups({});
    const groupNameById = useMemo(
        () => new Map((groupsData?.items ?? []).map((g: any) => [String(g._id), g.name])),
        [groupsData]
    );

    const allDriverIds = useMemo(
        () =>
            Array.from(
                new Set(
                    (shares ?? []).flatMap((s: any) => (s?.driverIds ?? []).map((id: any) => String(id)))
                )
            ),
        [shares]
    );
    const { map: driversMap, isLoading: driversLoading } = useDriversPublicBatchMap(allDriverIds);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!ride?.fromLocation || !ride?.toLocation) { setRouteLine([]); return; }
            const [lonA, latA] = ride.fromLocation.coordinates;
            const [lonB, latB] = ride.toLocation.coordinates;
            const r = await getRoute([lonA, latA], [lonB, latB]);
            if (cancelled) return;
            setRouteLine(r.geometry);
        })();
        return () => { cancelled = true; };
    }, [ride?.fromLocation, ride?.toLocation]);

    const statusValue = ride?.status || "unassigned";
    const header = useMemo(() => {
        if (!ride) return "";
        return `${ride.from} → ${ride.to}`;
    }, [ride]);

    async function onRevokeShare(shareId: string) {
        const ok = confirm(`Revoke this share? `);
        if (!ok) return;
        setRevokingId(shareId);
        setError(null);
        try {
            await useRevokeRideShare(shareId);
            await mutate();
        } catch (e: any) {
            setError(e?.message || "Failed to revoke share");
        } finally {
            setRevokingId(null);
        }
    }

    async function onChangeStatus(next: Ride["status"]) {
        const res = await setRideStatus({ status: next });
        if (res?.ok) await mutate();
    }

    async function onDelete() {
        // eslint-disable-next-line no-alert
        const ok = confirm("Delete this ride?");
        if (!ok) return;
        const res = await deleteRide();
        if (res?.ok) router.push("/rides");
    }

    if (!ride) {
        return (
            <ProtectedLayout>
                <Container className="px-3 sm:px-6 lg:px-8">
                    <div className="py-8 text-sm text-gray-600">Loading…</div>
                </Container>
            </ProtectedLayout>
        );
    }

    return (
        <ProtectedLayout>
            <Container className="px-3 sm:px-6 lg:px-8">
                <div className="space-y-4 sm:space-y-6">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => router.push("/rides")}>
                                Back
                            </Button>
                            <Typography variant="h1" className="text-base sm:text-2xl font-bold text-gray-900 whitespace-normal break-words hyphens-auto leading-tight">
                                {header}3
                            </Typography>
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                value={statusValue}
                                onChange={(e) => onChangeStatus(e.target.value as Ride["status"])}
                                disabled={isSettingStatus}
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                {STATUS.map((s) => (
                                    <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                                ))}
                            </select>
                            <Button variant="outline" size="sm" leftIcon={<Trash2 className="w-4 h-4" />} onClick={onDelete} disabled={isDeleting}>
                                Delete
                            </Button>
                        </div>
                        {canShare && (
                            <Link href={`/rides/${id}/share`}>
                                <Button variant="outline" size="sm" leftIcon={<Share2 className="w-4 h-4" />}>
                                    Manage Shares
                                </Button>
                            </Link>
                        )}
                    </div>

                    {/* Summary */}
                    <Card variant="elevated">
                        <CardBody className="p-4 sm:p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <div className="space-y-3">
                                    <div className="flex items-center text-sm text-gray-700">
                                        <User className="w-4 h-4 mr-2 text-gray-400" />
                                        <span className="font-medium mr-1">Customer Name:</span>
                                        {ride.customer.name}
                                    </div>
                                    <div className="flex items-center text-sm text-gray-700">
                                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                        <span className="font-medium mr-1">When:</span>
                                        {fmtDate(ride.datetime)} • {fmtTime(ride.datetime)}
                                    </div>
                                    <div className="flex items-center text-sm text-gray-700">
                                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                                        <span className="font-medium mr-1">From:</span>
                                        <span className="truncate">{ride.from}</span>
                                    </div>
                                    <div className="flex items-center text-sm text-gray-700">
                                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                                        <span className="font-medium mr-1">To:</span>
                                        <span className="truncate">{ride.to}</span>
                                    </div>
                                    <div className="flex items-center text-sm text-gray-700">
                                        <Navigation className="w-4 h-4 mr-2 text-gray-400" />
                                        <span className="font-medium mr-1">Type:</span>
                                        {ride.type}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center text-sm text-gray-700">
                                        <PhoneIcon className="w-4 h-4 mr-2 text-gray-400" />
                                        <span className="font-medium mr-1">Customer Phone:</span>
                                        {ride.customer.phone}
                                    </div>
                                    <div className="flex items-center text-sm text-gray-700">
                                        <DollarSign className="w-4 h-4 mr-2 text-gray-400" />
                                        <span className="font-medium mr-1">Fare:</span>
                                        {money(ride.payment?.amountCents)}
                                    </div>
                                    <div className="flex items-center text-sm text-gray-700">
                                        <Clock className="w-4 h-4 mr-2 text-gray-400" />
                                        <span className="font-medium mr-1">ETA:</span>
                                        {mins((ride as any).durationMinutes)}
                                    </div>
                                    <div className="flex items-center text-sm text-gray-700">
                                        <Navigation className="w-4 h-4 mr-2 text-gray-400" />
                                        <span className="font-medium mr-1">Distance:</span>
                                        {km(ride.distance)}
                                    </div>
                                    <div className="flex items-center text-sm text-gray-700">
                                        <User className="w-4 h-4 mr-2 text-gray-400" />
                                        <span className="font-medium mr-1">Assigned driver:</span>

                                        {ride.assignedDriverId ? (
                                            // ✅ Use a Link/Button structure for the assigned driver
                                            <Link
                                                href={`/users/${ride.assignedDriverId}`}
                                                className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700
                       ring-1 ring-inset ring-indigo-600/20 hover:bg-indigo-100 transition-colors truncate"
                                            >
                                                <span className="truncate">
                                                    {/* Primary Display: Driver Name (or "View driver") */}
                                                    {driver?.name || "View driver"}
                                                </span>
                                                {/* Secondary Display: Driver Email (if available) - optional to include in the button */}
                                                {driver?.email ? (
                                                    <span className="ml-1 text-gray-600/80"> • {driver.email}</span>
                                                ) : null}
                                            </Link>
                                        ) : (
                                            // Fallback for unassigned
                                            "—"
                                        )}
                                    </div>
                                    {ride.status === "unassigned" && (
                                        <Button size="sm" onClick={() => router.push(`/rides/${ride._id}/assign`)}>
                                            Assign driver
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {canShare && (
                        <Card variant="elevated" className="mt-4">
                            <CardBody className="p-4 sm:p-6 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Share2 className="w-4 h-4 text-indigo-600" />
                                    <Typography className="font-semibold text-gray-900">Ride Shares</Typography>
                                </div>

                                {sharesLoading ? (
                                    <div className="text-sm text-gray-600">Loading shares…</div>
                                ) : shares?.length === 0 ? (
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-gray-600">No active shares.</div>
                                        <Link href={`/rides/${id}/share`}>
                                            <Button size="sm" leftIcon={<Share2 className="w-4 h-4" />}>
                                                Create Share
                                            </Button>
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {shares.map((s: any) => {
                                            const groups = (s.groupIds ?? []).map((gid: any) => String(gid));
                                            const drivers = (s.driverIds ?? []).map((uid: any) => String(uid));

                                            return (
                                                <div key={s.shareId} className="rounded-lg border p-3 space-y-2 bg-white">
                                                    {/* Top row: basic meta */}
                                                    <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs capitalize">
              {s.visibility}
            </span>
                                                        {typeof s.maxClaims === "number" && (
                                                            <span className="text-xs text-gray-600">Max claims: {s.maxClaims}</span>
                                                        )}
                                                        <span className="text-xs text-gray-600">
              Expires: {s.expiresAt ? new Date(s.expiresAt).toLocaleString() : "—"}
            </span>
                                                        <span className="text-xs text-gray-600">Status: {s.status || "active"}</span>
                                                    </div>

                                                    {/* ACL: Groups */}
                                                    {groups.length > 0 && (
                                                        <div className="mt-1">
                                                            <div className="flex items-center gap-1 text-xs text-gray-700 mb-1">
                                                                <Users className="w-3.5 h-3.5 text-gray-500" />
                                                                <span className="font-medium">Groups</span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {groups.map((gid) => (
                                                                    <span
                                                                        key={gid}
                                                                        className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs bg-white"
                                                                        title={gid}
                                                                    >
                    {groupNameById.get(gid) || `Group ${gid.slice(-6)}`}
                  </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* ACL: Drivers */}
                                                    {drivers.length > 0 && (
                                                        <div className="mt-1">
                                                            <div className="flex items-center gap-1 text-xs text-gray-700 mb-1">
                                                                <UserIcon className="w-3.5 h-3.5 text-gray-500" />
                                                                <span className="font-medium">Drivers</span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {drivers.map((uid) => {
                                                                    const d = driversMap[uid];
                                                                    const display = d?.name || `User ${uid.slice(-6)}`;
                                                                    const secondary = d?.email || "";
                                                                    return (
                                                                        <span
                                                                            key={uid}
                                                                            className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs bg-white"
                                                                            title={secondary || uid}
                                                                        >
                      <Link
                          href={`/users/${uid}`}
                          className="hover:underline font-medium text-gray-900 truncate max-w-[12rem]"
                      >
                        {display}
                      </Link>
                                                                            {secondary && (
                                                                                <span className="text-gray-600 truncate max-w-[10rem]">• {secondary}</span>
                                                                            )}
                    </span>
                                                                    );
                                                                })}
                                                                {driversLoading && (
                                                                    <span className="text-xs text-gray-600">Loading drivers…</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* URL (only if present) */}
                                                    {s.url && (
                                                        <div className="flex items-center gap-2 rounded-md border p-2">
                                                            <Link2 className="w-4 h-4 text-gray-500 shrink-0" />
                                                            <div className="truncate text-sm">{s.url}</div>
                                                            <button
                                                                type="button"
                                                                className="ml-auto inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                                                                onClick={() => navigator.clipboard.writeText(s.url!)}
                                                            >
                                                                <Copy className="w-3.5 h-3.5" /> Copy
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {/* Footer CTA */}
                                        <div className="pt-1">
                                            {canShare && (
                                                <Link href={`/rides/${id}/share`}>
                                                    <Button variant="outline" size="sm">
                                                        Manage Shares
                                                    </Button>
                                                </Link>
                                            )}
                                            <Link href={`/rides/${id}/share`}>
                                                <Button size="sm" variant="outline" className="ml-2">
                                                    Create Another Share
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    )}

                    {/* Map */}
                    {(hasA || hasB) && (
                        <Card variant="elevated">
                            <CardBody className="p-3 sm:p-4">
                                <LeafletMap
                                    heightClass="h-64 sm:h-80"
                                    markerA={hasA ? (ride!.fromLocation!.coordinates as [number, number]) : undefined}
                                    markerALabel="A"
                                    markerB={hasB ? (ride!.toLocation!.coordinates as [number, number]) : undefined}
                                    markerBLabel="B"
                                    routeLine={routeLine}
                                    center={
                                        hasA ? (ride!.fromLocation!.coordinates as [number, number])
                                            : hasB ? (ride!.toLocation!.coordinates as [number, number])
                                                : undefined
                                    }
                                />
                            </CardBody>
                        </Card>
                    )}

                    {/* Notes + Payment flags */}
                    <Card variant="elevated">
                        <CardBody className="p-4 sm:p-6 space-y-4">
                            <div>
                                <Typography className="text-sm font-medium text-gray-900 mb-1">Notes</Typography>
                                <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-700 min-h-[44px] bg-white">
                                    {ride.notes?.trim() || "—"}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                                <div className="rounded-lg border border-gray-200 p-3">
                                    <div className="text-gray-500">Payment Method</div>
                                    <div className="font-medium text-gray-900">{ride.payment?.method || "—"}</div>
                                </div>
                                <div className="rounded-lg border border-gray-200 p-3">
                                    <div className="text-gray-500">Paid</div>
                                    <div className="font-medium text-gray-900">{ride.payment?.paid ? "Yes" : "No"}</div>
                                </div>
                                <div className="rounded-lg border border-gray-200 p-3">
                                    <div className="text-gray-500">Driver Settled</div>
                                    <div className="font-medium text-gray-900">{ride.payment?.driverPaid ? "Yes" : "No"}</div>
                                </div>
                                <div className="rounded-lg border border-gray-200 p-3">
                                    <div className="text-gray-500">Visibility</div>
                                    <div className="font-medium text-gray-900">{ride.coveredVisible ? "Visible" : "Hidden"}</div>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </Container>
        </ProtectedLayout>
    );
}
