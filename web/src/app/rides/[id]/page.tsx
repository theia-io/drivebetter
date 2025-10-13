// app/rides/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import { ArrowLeft, Calendar, Clock, DollarSign, MapPin, Navigation, Trash2 } from "lucide-react";
import LeafletMap from "@/components/ui/maps/LeafletMap";
import { useRide, useSetRideStatus, useDeleteRide } from "@/stores/rides";
import { getRoute } from "@/stores/routes";
import {Ride} from "@/types";

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString();
const money = (cents?: number) => (typeof cents === "number" ? `$${(cents / 100).toFixed(2)}` : "—");
const km = (m?: number) => (m ? `${(m / 1000).toFixed(1)} km` : "—");
const mins = (m?: number) => (m ? `${m} min` : "—");

const STATUS: Ride["status"][] = ["unassigned","assigned","on_my_way","on_location","pob","clear","completed"];

export default function RideDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { data: ride, mutate } = useRide(id);
    const { setRideStatus, isSettingStatus } = useSetRideStatus(id);
    const { deleteRide, isDeleting } = useDeleteRide(id);

    const [routeLine, setRouteLine] = useState<[number, number][]>([]);
    const hasA = !!ride?.fromLocation?.coordinates?.length;
    const hasB = !!ride?.toLocation?.coordinates?.length;

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
                    </div>

                    {/* Summary */}
                    <Card variant="elevated">
                        <CardBody className="p-4 sm:p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <div className="space-y-3">
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
                                        {km((ride as any).distanceMeters)}
                                    </div>
                                    <div className="text-sm text-gray-700">
                                        <span className="font-medium mr-1">Assigned driver:</span>
                                        {ride.assignedDriverId ? ride.assignedDriverId : "—"}
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
