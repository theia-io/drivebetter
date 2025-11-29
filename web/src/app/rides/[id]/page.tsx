// app/rides/[id]/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui/";
import {
    ArrowLeft,
    Calendar,
    Clock,
    DollarSign,
    MapPin,
    Navigation,
    PhoneIcon,
    Share2,
    Trash2,
    User,
    UserIcon,
    Users,
    Check,
    X as XIcon,
    Loader2,
    Play,
} from "lucide-react";
import Link from "next/link";

import LeafletMap from "@/components/ui/maps/LeafletMap";
import { Ride, RideCreatorUser } from "@/types";
import { useRide, useSetRideStatus, useDeleteRide } from "@/stores/rides";
import { useUser, useDriversPublicBatchMap } from "@/stores/users";
import { getRoute } from "@/stores/routes";
import { useAuthStore } from "@/stores";
import { useRideClaims, useApproveRideClaim, useRejectRideClaim } from "@/stores/rideClaims";
import { fmtDate, fmtTime, km, mins, money } from "@/services/convertors";
import AssignDriverSelect from "@/components/ui/ride/AssignDriverSelect";
import RideShareQuickPanel from "@/components/ui/ride/RideShareQuickPanel";
import RideStatusDropdown from "@/components/ui/ride/RideStatusDropdown";
import {
    getPillStatusColor,
    getStatusLabel,
    type RideStatus,
} from "@/types/rideStatus";
import RideStatusStepper from "@/components/ui/ride/RideStatusStepper";

export default function RideDetailsPage() {
    const { user } = useAuthStore();
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const { data: ride, mutate } = useRide(id);
    const { setRideStatus, isSettingStatus } = useSetRideStatus(id);
    const { deleteRide, isDeleting } = useDeleteRide(id);

    const canManage =
        user?.roles?.some((r) => r === "admin" || r === "dispatcher") ||
        (ride?.creatorId as RideCreatorUser)?._id == user?._id;

    const isAssignedDriver =
        ride?.assignedDriverId && user?._id
            ? String(ride.assignedDriverId) === String(user._id)
            : false;

    const canChangeStatus = !!ride && (canManage || isAssignedDriver);

    const assignedDriverId = ride?.assignedDriverId;
    const { data: driver } = useUser(assignedDriverId);

    // Claims (driver requests)
    const { data: claims = [], isLoading: claimsLoading, mutate: mutateClaims } = useRideClaims(id);

    const { approve, isApproving } = useApproveRideClaim(id);
    const { reject, isRejecting } = useRejectRideClaim(id);

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

    // Resolve driver names/emails for all claims
    const claimDriverIds = useMemo(
        () => Array.from(new Set(claims.map((c) => c.driverId))),
        [claims]
    );
    const { map: claimDriversMap, isLoading: claimDriversLoading } =
        useDriversPublicBatchMap(claimDriverIds);

    const [routeLine, setRouteLine] = useState<[number, number][]>([]);
    const [error, setError] = useState<string | null>(null);

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
                <Container className="px-3 sm:px-6 lg:px-8">
                    <div className="py-8 text-sm text-gray-600">Loading…</div>
                </Container>
            </ProtectedLayout>
        );
    }

    const header = `${ride.from} → ${ride.to}`;

    async function handleStatusChange(next: RideStatus) {
        const res = await setRideStatus({ status: next });
        if (res?.ok) await mutate();
    }

    async function onDelete() {
        const ok = confirm("Delete this ride?");
        if (!ok) return;
        const res = await deleteRide();
        if (res?.ok) router.push("/rides");
    }

    async function onApproveClaim(claimId: string) {
        try {
            setError(null);
            await approve(claimId);
            await Promise.all([mutate(), mutateClaims()]);
        } catch (e: any) {
            setError(e?.message || "Failed to approve request");
        }
    }

    async function onRejectClaim(claimId: string) {
        try {
            setError(null);
            await reject(claimId);
            await mutateClaims();
        } catch (e: any) {
            setError(e?.message || "Failed to reject request");
        }
    }

    function scrollToRequests() {
        if (!requestsRef.current) return;
        requestsRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    }

    const isActiveModeAvailable =
        isAssignedDriver && ride.status !== "unassigned" && ride.status !== "completed";

    // --- Ride details view ---
    return (
        <ProtectedLayout>
            <Container className="px-3 sm:px-6 lg:px-8">
                <div className="space-y-4 sm:space-y-6">
                    {/* Toolbar */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                                className="text-base sm:text-2xl font-bold text-gray-900 whitespace-normal break-words hyphens-auto leading-tight"
                            >
                                {header}
                            </Typography>
                        </div>

                        {(canChangeStatus || (canManage && hasQueuedClaims)) && (
                            <div className="flex flex-col items-start sm:items-end gap-2">
                                {canChangeStatus && (
                                    <span
                                        className={[
                                            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                                            statusPillClasses,
                                        ].join(" ")}
                                    >
                                        <span className="mr-1 text-[10px] uppercase tracking-wide text-gray-600/80">
                                            Status
                                        </span>
                                        <span className="capitalize">{statusLabel}</span>
                                    </span>
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

                    {/* Status / actions card */}
                    {canChangeStatus && (
                        <Card variant="elevated">
                            <CardBody className="p-4 sm:p-5 space-y-4">
                                <div>
                                    <Typography className="text-sm font-semibold text-gray-900">
                                        Ride status
                                    </Typography>
                                    <p className="mt-1 text-xs sm:text-sm text-gray-600 max-w-md">
                                        Track and update the ride lifecycle: unassigned, assigned,
                                        on my way, on location, passenger on board, clear,
                                        completed.
                                    </p>
                                </div>

                                <div>
                                    <RideStatusStepper value={statusValue} />
                                    <div className="mt-1 text-[11px] text-gray-600">
                                        Current:{" "}
                                        <span className="font-semibold">{statusLabel}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div
                                        className="w-full sm:w-80"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <RideStatusDropdown
                                            value={statusValue}
                                            disabled={isSettingStatus}
                                            onChange={handleStatusChange}
                                            className="w-full"
                                        />
                                    </div>

                                    {canManage && (
                                        <Button
                                            variant="outline"
                                            colorScheme="error"
                                            size="sm"
                                            leftIcon={<Trash2 className="w-4 h-4" />}
                                            onClick={onDelete}
                                            disabled={isDeleting}
                                            className="w-full sm:w-auto"
                                        >
                                            Delete ride
                                        </Button>
                                    )}
                                </div>

                                {/* Floating Active Ride activator (driver only) */}
                                {isActiveModeAvailable && (
                                    <div className="fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-40">
                                        <div className="group relative flex flex-col items-end gap-1">
                                            <button
                                                type="button"
                                                onClick={() => router.push(`/rides/${id}/active`)}
                                                className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                                aria-label="Open Active Ride mode"
                                            >
                                                <Play className="w-7 h-7" />
                                            </button>
                                            {/* Mobile-visible text under the FAB */}
                                            <div className="rounded-md bg-gray-900 px-2 py-1 text-[11px] text-white sm:hidden">
                                                Active Ride mode
                                            </div>
                                            {/* Hover label on larger screens */}
                                            <div className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 rounded-md bg-gray-900 px-2 py-1 text-[11px] text-white opacity-0 group-hover:opacity-100 hidden sm:block">
                                                Open Active Ride mode
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    )}

                    {/* Pending driver requests */}
                    {canManage && (
                        <div ref={requestsRef}>
                            <Card variant="elevated">
                                <CardBody className="p-4 sm:p-6 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-indigo-600" />
                                        <Typography className="font-semibold text-gray-900">
                                            Pending driver requests
                                        </Typography>
                                        {hasQueuedClaims && (
                                            <span className="ml-auto inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                                                {queuedClaims.length} pending
                                            </span>
                                        )}
                                        {approvedClaim && (
                                            <span className="ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs bg-green-50 text-green-700 border-green-200">
                                                <Check className="w-3.5 h-3.5 mr-1" />
                                                Approved driver selected
                                            </span>
                                        )}
                                    </div>

                                    {claimsLoading ? (
                                        <div className="text-sm text-gray-600 flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Loading
                                            requests…
                                        </div>
                                    ) : queuedClaims.length === 0 ? (
                                        <div className="text-sm text-gray-600">
                                            No pending driver requests.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {queuedClaims.map((c: any, idx: number) => {
                                                const d = claimDriversMap[c.driverId];
                                                const name =
                                                    d?.name || `User ${c.driverId.slice(-6)}`;
                                                const email = d?.email;

                                                return (
                                                    <div
                                                        key={c.claimId}
                                                        className="flex flex-wrap items-center gap-2 justify-between rounded-lg border p-2 bg-white"
                                                    >
                                                        <div className="min-w-0 flex items-start gap-2">
                                                            {/* queue index */}
                                                            <span className="mt-0.5 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">
                                                                #{idx + 1}
                                                            </span>
                                                            <UserIcon className="w-4 h-4 text-gray-500 mt-0.5" />
                                                            <div className="min-w-0">
                                                                <div className="text-sm font-medium text-gray-900 truncate">
                                                                    <Link
                                                                        href={`/users/${c.driverId}`}
                                                                        className="hover:underline"
                                                                    >
                                                                        {name}
                                                                    </Link>
                                                                </div>
                                                                <div className="text-xs text-gray-600 truncate">
                                                                    {email || "—"}
                                                                </div>
                                                                {c.createdAt && (
                                                                    <div className="text-xs sm:text-sm text-gray-500 mt-1">
                                                                        Requested{" "}
                                                                        {fmtDate(c.createdAt)} •{" "}
                                                                        {fmtTime(c.createdAt)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                size="sm"
                                                                onClick={() =>
                                                                    onApproveClaim(c.claimId)
                                                                }
                                                                disabled={isApproving}
                                                                className="text-xs py-1 px-2 bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
                                                                leftIcon={
                                                                    isApproving ? (
                                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                                    ) : (
                                                                        <Check className="w-4 h-4" />
                                                                    )
                                                                }
                                                            >
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() =>
                                                                    onRejectClaim(c.claimId)
                                                                }
                                                                disabled={isRejecting}
                                                                className="text-xs py-1 px-2 border-amber-400 text-amber-700 hover:bg-amber-50 focus:ring-amber-500"
                                                                leftIcon={
                                                                    isRejecting ? (
                                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                                    ) : (
                                                                        <XIcon className="w-4 h-4" />
                                                                    )
                                                                }
                                                            >
                                                                Reject
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {claimDriversLoading && queuedClaims.length > 0 && (
                                        <div className="text-xs text-gray-600">
                                            Loading driver info…
                                        </div>
                                    )}

                                    {error && (
                                        <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                                            {error}
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </div>
                    )}

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
                                            <Link
                                                href={`/users/${ride.assignedDriverId}`}
                                                className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/20 hover:bg-indigo-100 transition-colors truncate"
                                            >
                                                <span className="truncate">
                                                    {driver?.name || "View driver"}
                                                </span>
                                                {driver?.email ? (
                                                    <span className="ml-1 text-gray-600/80">
                                                        {" "}
                                                        • {driver.email}
                                                    </span>
                                                ) : null}
                                            </Link>
                                        ) : (
                                            "—"
                                        )}
                                    </div>

                                    {ride.status === "unassigned" && canManage && (
                                        <div className="pt-1">
                                            <AssignDriverSelect
                                                rideId={ride._id}
                                                currentDriverId={ride.assignedDriverId || undefined}
                                                onAssigned={() => {
                                                    mutate();
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Shares */}
                    {canManage && (
                        <Card variant="elevated">
                            <CardBody className="p-4 sm:p-6 space-y-3">
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

                    {/* Map */}
                    {(hasA || hasB) && (
                        <Card variant="elevated">
                            <CardBody className="p-3 sm:p-4">
                                <LeafletMap
                                    heightClass="h-64 sm:h-80 z-10"
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
                        <CardBody className="p-4 sm:p-6 space-y-4">
                            <div>
                                <Typography className="text-sm font-medium text-gray-900 mb-1">
                                    Notes
                                </Typography>
                                <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-700 min-h-[44px] bg-white">
                                    {ride.notes?.trim() || "—"}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
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
