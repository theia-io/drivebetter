// app/rides/[id]/page.tsx
"use client";

import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui/";
import { ArrowLeft, Share2, Users } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import HandleRideStatus from "@/components/ride/RideStatus";
import RideSummary from "@/components/ride/RideSummary";
import LeafletMap from "@/components/ui/maps/LeafletMap";
import RideShareQuickPanel from "@/components/ui/ride/RideShareQuickPanel";
import { useAuthStore } from "@/stores";
import { useRideClaims } from "@/stores/rideClaims";
import { useRide } from "@/stores/rides";
import { getRoute } from "@/stores/routes";
import { RideCreatorUser } from "@/types";
import { getPillStatusColor, getStatusLabel, type RideStatus } from "@/types/rideStatus";
import PendingDriverRequests from "../../../components/ride/PendingDriver";

export default function RideDetailsPage() {
    const { user } = useAuthStore();
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const { data: ride, mutate } = useRide(id);

    const canManage =
        user?.roles?.some((r) => r === "admin") ||
        (ride?.creatorId as RideCreatorUser)?._id == user?._id;

    const isAssignedDriver =
        ride?.assignedDriverId && user?._id
            ? String(ride.assignedDriverId) === String(user._id)
            : false;

    const canChangeStatus = !!ride && (canManage || isAssignedDriver);

    // Claims (driver requests)
    const { data: claims = [], isLoading: claimsLoading } = useRideClaims(id);

    // Sort queued claims by createdAt ascending so order is clear
    const queuedClaims = useMemo(
        () =>
            claims
                .filter((c) => c.status === "queued")
                .slice()
                .sort((a: any, b: any) => {
                    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return ta - tb;
                }),
        [claims]
    );

    const approvedClaim = useMemo(() => claims.find((c) => c.status === "approved"), [claims]);

    const hasQueuedClaims = queuedClaims.length > 0;

    const [routeLine, setRouteLine] = useState<[number, number][]>([]);

    const hasA = !!ride?.fromLocation?.coordinates?.length;
    const hasB = !!ride?.toLocation?.coordinates?.length;

    const statusValue: RideStatus = (ride?.status as RideStatus) || "unassigned";
    const statusLabel = getStatusLabel(statusValue);
    const statusPillClasses = getPillStatusColor(statusValue);

    const requestsRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!ride?.fromLocation || !ride?.toLocation) {
                setRouteLine([]);
                return;
            }
            const [lonA, latA] = ride.fromLocation.coordinates;
            const [lonB, latB] = ride.toLocation.coordinates;
            const r = await getRoute([lonA, latA], [lonB, latB]);

            if (cancelled) return;
            setRouteLine(r.geometry);
        })();

        return () => {
            cancelled = true;
        };
    }, [ride?.fromLocation, ride?.toLocation]);

    if (!ride) {
        return (
            <ProtectedLayout>
                <Container className="px-3 md:px-6 lg:px-8">
                    <div className="py-8 text-sm text-gray-600">Loading…</div>
                </Container>
            </ProtectedLayout>
        );
    }

    const header = `${ride.from} → ${ride.to}`;

    function scrollToRequests() {
        if (!requestsRef.current) return;
        requestsRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    }

    console.log("ride", ride);

    // --- Ride details view ---
    return (
        <ProtectedLayout>
            <Container className="px-3 md:px-6 lg:px-8">
                <div className="space-y-4 md:space-y-6">
                    {/* Toolbar */}
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between @container/toolbar">
                        <div className="flex items-center gap-2 min-w-0">
                            <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<ArrowLeft className="w-4 h-4" />}
                                onClick={() => router.push("/rides")}
                            >
                                Back
                            </Button>
                            <Typography
                                variant="h1"
                                className="text-base md:text-2xl font-bold text-gray-900 whitespace-normal break-words hyphens-auto leading-tight"
                            >
                                {header}
                            </Typography>
                        </div>

                        {(canChangeStatus || (canManage && hasQueuedClaims)) && (
                            <div className="flex flex-col items-start md:items-end gap-2">
                                {canChangeStatus && (
                                    <div
                                        className={[
                                            "inline-flex flex-col @4xl:flex-row @4xl:items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                                            statusPillClasses,
                                        ].join(" ")}
                                    >
                                        <span className="mr-1 text-[10px] uppercase tracking-wide text-gray-600/80">
                                            Status
                                        </span>
                                        <span className="capitalize">{statusLabel}</span>
                                    </div>
                                )}

                                {canManage && hasQueuedClaims && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={scrollToRequests}
                                        className="flex items-center gap-2 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 focus:ring-amber-500"
                                        leftIcon={<Users className="w-4 h-4" />}
                                    >
                                        <span className="text-xs font-medium">
                                            Pending driver requests
                                        </span>
                                        <span className="inline-flex items-center justify-center rounded-full bg-amber-600 text-white text-xs min-w-[1.5rem] h-5 px-1.5">
                                            {queuedClaims.length}
                                        </span>
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    <HandleRideStatus id={id} />

                    {/* Pending driver requests */}
                    {canManage && <PendingDriverRequests requestsRef={requestsRef} id={id} />}

                    {/* Shares */}
                    {canManage && (
                        <Card variant="elevated">
                            <CardBody className="p-4 md:p-6 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Share2 className="w-4 h-4 text-indigo-600" />
                                    <Typography className="font-semibold text-gray-900">
                                        Ride Shares
                                    </Typography>
                                </div>
                                <RideShareQuickPanel rideId={ride._id} className="w-full z-1100" />
                            </CardBody>
                        </Card>
                    )}

                    <RideSummary id={id} />

                    {/* Map */}
                    {(hasA || hasB) && (
                        <Card variant="elevated">
                            <CardBody className="p-3 md:p-4">
                                <LeafletMap
                                    heightClass="h-64 md:h-80 z-10"
                                    markerA={
                                        hasA
                                            ? (ride!.fromLocation!.coordinates as [number, number])
                                            : undefined
                                    }
                                    markerALabel="A"
                                    markerB={
                                        hasB
                                            ? (ride!.toLocation!.coordinates as [number, number])
                                            : undefined
                                    }
                                    markerBLabel="B"
                                    routeLine={routeLine}
                                    center={
                                        hasA
                                            ? (ride!.fromLocation!.coordinates as [number, number])
                                            : hasB
                                              ? (ride!.toLocation!.coordinates as [number, number])
                                              : undefined
                                    }
                                />
                            </CardBody>
                        </Card>
                    )}

                    {/* Notes + Payment flags */}
                    <Card variant="elevated">
                        <CardBody className="p-4 md:p-6 space-y-4">
                            <div>
                                <Typography className="text-sm font-medium text-gray-900 mb-1">
                                    Notes
                                </Typography>
                                <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-700 min-h-[44px] bg-white">
                                    {ride.notes?.trim() || "—"}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                <div className="rounded-lg border border-gray-200 p-3">
                                    <div className="text-gray-500">Payment Method</div>
                                    <div className="font-medium text-gray-900">
                                        {ride.payment?.method || "—"}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-gray-200 p-3">
                                    <div className="text-gray-500">Paid</div>
                                    <div className="font-medium text-gray-900">
                                        {ride.payment?.paid ? "Yes" : "No"}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-gray-200 p-3">
                                    <div className="text-gray-500">Driver Settled</div>
                                    <div className="font-medium text-gray-900">
                                        {ride.payment?.driverPaid ? "Yes" : "No"}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-gray-200 p-3">
                                    <div className="text-gray-500">Visibility</div>
                                    <div className="font-medium text-gray-900">
                                        {ride.coveredVisible ? "Visible" : "Hidden"}
                                    </div>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </Container>
        </ProtectedLayout>
    );
}
