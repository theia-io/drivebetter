"use client";

import { Button, Card, CardBody, Typography } from "@/components/ui";
import AssignDriverSelect from "@/components/ride/selectors/AssignDriverSelect";
import AssignedDriverBadge from "@/components/ride/badges/AssignedDriverBadge";
import RideCreatorBadge from "@/components/ride/badges/RideCreatorBadge";
import RideShareQuickPanel from "@/components/ride/RideShareQuickPanel";
import RideStatusDropdown from "@/components/ride/status/RideStatusDropdown";
import RideStatusStepper from "@/components/ride/status/RideStatusStepper";
import { fmtDate, fmtTime, km, mins, money } from "@/services/convertors";
import { useAuthStore } from "@/stores";
import { useApproveRideClaim, useRejectRideClaim, useRideClaims } from "@/stores/rideClaims";
import { useSetRideStatus } from "@/stores/rides";
import { useDriversPublicBatchMap } from "@/stores/users";
import { Ride, RideCreatorUser } from "@/types";
import {
    getPillStatusColor,
    getPossibleStatuses,
    getStatusDotColor,
    getStatusLabel,
    type RideStatus,
} from "@/types/rideStatus";
import {
    Calendar,
    Car,
    Check,
    ChevronDown,
    Clock,
    DollarSign,
    Eye,
    Loader2,
    MapPin,
    Navigation,
    User,
    UserIcon,
    Users,
    X as XIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type RideSummaryCardProps = {
    ride: Ride;
    detailsHref?: string;
    hideActions?: boolean;
    onDriverAssigned?: (driverUserId: string) => void;
    onStatusChanged?: (updatedRide: Ride) => void;
    variant?: "card" | "accordion";
    defaultExpanded?: boolean;
};

export default function RideSummaryCard({
    ride,
    detailsHref,
    hideActions = false,
    onDriverAssigned,
    onStatusChanged,
    variant = "card",
    defaultExpanded = false,
}: RideSummaryCardProps) {
    const { user } = useAuthStore();
    const roles = user?.roles ?? [];

    const isAdmin = roles.includes("admin");
    const isDispatcher = roles.includes("dispatcher");

    const isCreator = useMemo(() => {
        if (!ride.creatorId || !user?._id) return false;
        return (ride.creatorId as RideCreatorUser)._id === String(user._id);
    }, [ride.creatorId, user?._id]);

    const isPrivileged = isAdmin || isDispatcher || isCreator;

    const isAssignedDriver =
        ride.assignedDriverId && user?._id
            ? String(ride.assignedDriverId) === String(user._id)
            : false;

    const canChangeStatus = isPrivileged || isAssignedDriver;

    const { setRideStatus, isSettingStatus } = useSetRideStatus(ride._id);

    const rideDate = fmtDate(ride.datetime);
    const rideTime = fmtTime(ride.datetime);
    const distanceText = km(ride.distance);
    const etaText = mins((ride as any).durationMinutes);
    const amountText = money(ride.payment?.amountCents);

    const [localStatus, setLocalStatus] = useState<RideStatus>(
        (ride.status as RideStatus) || "unassigned"
    );

    useEffect(() => {
        setLocalStatus((ride.status as RideStatus) || "unassigned");
    }, [ride.status]);

    const statusValue: RideStatus = localStatus;
    const statusLabel = getStatusLabel(statusValue);
    const showAssign = isPrivileged && statusValue === "unassigned";

    const [expanded, setExpanded] = useState<boolean>(variant === "card" ? true : defaultExpanded);

    useEffect(() => {
        if (variant === "card") setExpanded(true);
    }, [variant]);

    const isAccordion = variant === "accordion";

    async function handleStatusChange(next: RideStatus): Promise<void> {
        if (!next || next === localStatus) return;

        const prev = localStatus;
        setLocalStatus(next);

        try {
            await setRideStatus({ status: next });
            onStatusChanged?.({
                ...(ride as Ride),
                status: next,
            });
        } catch {
            setLocalStatus(prev);
        }
    }

    // Claims
    const {
        data: claims = [],
        isLoading: claimsLoading,
        mutate: mutateClaims,
    } = useRideClaims(ride._id);

    const { approve, isApproving } = useApproveRideClaim(ride._id);
    const { reject, isRejecting } = useRejectRideClaim(ride._id);

    const [claimsError, setClaimsError] = useState<string | null>(null);

    // Sort queued claims by createdAt asc so order is obvious
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

    const claimDriverIds = useMemo(
        () => Array.from(new Set(claims.map((c) => c.driverId))),
        [claims]
    );
    const { map: claimDriversMap, isLoading: claimDriversLoading } =
        useDriversPublicBatchMap(claimDriverIds);

    async function handleApproveClaim(claimId: string, driverId: string) {
        try {
            setClaimsError(null);
            await approve(claimId);
            await mutateClaims();
            onDriverAssigned?.(driverId);
        } catch (e: any) {
            setClaimsError(e?.message || "Failed to approve request");
        }
    }

    async function handleRejectClaim(claimId: string) {
        try {
            setClaimsError(null);
            await reject(claimId);
            await mutateClaims();
        } catch (e: any) {
            setClaimsError(e?.message || "Failed to reject request");
        }
    }

    const hasQueuedClaims = queuedClaims.length > 0;

    return (
        <Card
            variant="elevated"
            className={`transition-shadow ${isAccordion ? "hover:shadow-md" : "hover:shadow-lg"}`}
        >
            <CardBody className="p-0">
                {/* HEADER */}
                <div
                    role={isAccordion ? "button" : undefined}
                    aria-expanded={isAccordion ? expanded : undefined}
                    className="w-full flex items-start gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-4 cursor-pointer"
                    onClick={() => {
                        if (!isAccordion) return;
                        setExpanded((v) => !v);
                    }}
                >
                    {/* Left icon with red indicator when pending claims exist */}
                    <div className="relative shrink-0">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                        </div>
                        {hasQueuedClaims && isPrivileged && (
                            <span className="flex absolute -top-0.5 -right-0.5 h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                            </span>
                        )}
                    </div>

                    {/* Center summary */}
                    <div className="min-w-0 flex-1 space-y-1 text-left">
                        <Typography className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                            {ride.from} → {ride.to}
                        </Typography>

                        {/* Pending indicator: button-style with numeric badge */}
                        {hasQueuedClaims && isPrivileged && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (isAccordion && !expanded) {
                                        setExpanded(true);
                                    }
                                }}
                                className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[10px] sm:text-xs font-medium text-red-800 hover:bg-red-100"
                            >
                                <Users className="w-3.5 h-3.5" />
                                <span>Pending driver requests</span>
                                <span className="inline-flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] sm:text-xs min-w-[1.25rem] h-4 sm:h-5 px-1.5">
                                    {queuedClaims.length}
                                </span>
                            </button>
                        )}

                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs text-gray-600">
                            <span className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3 text-gray-400" />
                                <span className="font-medium">
                                    {rideDate} · {rideTime}
                                </span>
                            </span>
                            {amountText && (
                                <span className="inline-flex items-center gap-1">
                                    <DollarSign className="w-3 h-3 text-gray-400" />
                                    <span>{amountText}</span>
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                <span className="uppercase tracking-wide text-[10px]">
                                    {ride.type === "reservation" ? "RESERVATION" : "ASAP"}
                                </span>
                            </span>
                        </div>

                        <div className="mt-0.5">
                            <RideCreatorBadge
                                creator={ride.creatorId as RideCreatorUser | undefined}
                            />
                        </div>
                    </div>

                    {/* Right column: status + header controls */}
                    <div className="flex flex-col items-end gap-1 shrink-0 pl-1">
                        <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium border ${getPillStatusColor(
                                statusValue
                            )}`}
                        >
                            <span
                                className={`mr-1 h-2 w-2 rounded-full ${getStatusDotColor(
                                    statusValue
                                )}`}
                            />
                            <span className="capitalize">{statusLabel}</span>
                        </span>

                        {isAccordion && (
                            <div className="flex items-center gap-1 mt-0.5">
                                <Link
                                    href={detailsHref || `/rides/${ride._id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-50"
                                >
                                    <Eye className="w-3 h-3 mr-1" />
                                    Details
                                </Link>
                                <span
                                    className={`inline-flex items-center justify-center rounded-full border border-gray-200 bg-white p-1 transition-transform ${
                                        expanded ? "rotate-180" : ""
                                    }`}
                                >
                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* DETAILS */}
                {expanded && (
                    <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3 sm:space-y-4 border-t border-gray-100">
                        {/* Stepper */}
                        <div className="pt-3">
                            <RideStatusStepper value={statusValue} />
                            <div className="mt-1 text-[11px] text-gray-600">
                                Current: <span className="font-semibold">{statusLabel}</span>
                            </div>
                        </div>

                        {/* Status control */}
                        {canChangeStatus && (
                            <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                                <RideStatusDropdown
                                    rideStatus={statusValue}
                                    possibleStatuses={getPossibleStatuses(statusValue, ride, user)}
                                    disabled={isSettingStatus}
                                    onChange={handleStatusChange}
                                    className="w-full"
                                />
                            </div>
                        )}

                        {/* Pending driver requests */}
                        {isPrivileged && (
                            <div
                                className="mt-2 rounded-lg border border-gray-100 bg-gray-50 p-2 sm:p-3 space-y-2"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center gap-2">
                                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                                    <span className="text-xs font-semibold text-gray-900">
                                        Pending driver requests
                                    </span>
                                    {hasQueuedClaims && (
                                        <span className="ml-auto inline-flex items-center rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-800">
                                            {queuedClaims.length} pending
                                        </span>
                                    )}
                                    {approvedClaim && (
                                        <span className="ml-2 inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
                                            <Check className="w-3 h-3 mr-1" />
                                            Approved driver selected
                                        </span>
                                    )}
                                </div>

                                {claimsLoading ? (
                                    <div className="text-xs text-gray-600 flex items-center gap-1.5">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Loading requests…
                                    </div>
                                ) : queuedClaims.length === 0 ? (
                                    <div className="text-xs text-gray-600">
                                        No pending requests.
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        {queuedClaims.map((c: any, idx: number) => {
                                            const d = claimDriversMap[c.driverId];
                                            const name = d?.name || `User ${c.driverId.slice(-6)}`;
                                            const email = d?.email;

                                            return (
                                                <div
                                                    key={c.claimId}
                                                    className="flex flex-wrap items-center gap-2 justify-between rounded-md border border-gray-200 bg-white p-2"
                                                >
                                                    <div className="min-w-0 flex items-start gap-2">
                                                        {/* queue index */}
                                                        <span className="mt-0.5 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">
                                                            #{idx + 1}
                                                        </span>
                                                        <UserIcon className="w-4 h-4 text-gray-500 mt-0.5" />
                                                        <div className="min-w-0">
                                                            <div className="text-xs font-medium text-gray-900 truncate">
                                                                <Link
                                                                    href={`/users/${c.driverId}`}
                                                                    className="hover:underline"
                                                                >
                                                                    {name}
                                                                </Link>
                                                            </div>
                                                            <div className="text-[11px] text-gray-600 truncate">
                                                                {email || "—"}
                                                            </div>
                                                            {c.createdAt && (
                                                                <div className="text-xs sm:text-sm text-gray-500 mt-1">
                                                                    Requested {fmtDate(c.createdAt)}{" "}
                                                                    • {fmtTime(c.createdAt)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5">
                                                        <Button
                                                            size="sm"
                                                            variant="solid"
                                                            onClick={() =>
                                                                handleApproveClaim(
                                                                    c.claimId,
                                                                    c.driverId
                                                                )
                                                            }
                                                            disabled={isApproving}
                                                            className="text-xs py-1 px-2 bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
                                                            leftIcon={
                                                                isApproving ? (
                                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                ) : (
                                                                    <Check className="w-3.5 h-3.5" />
                                                                )
                                                            }
                                                        >
                                                            Approve
                                                        </Button>

                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                handleRejectClaim(c.claimId)
                                                            }
                                                            disabled={isRejecting}
                                                            className="text-xs py-1 px-2 border-amber-400 text-amber-700 hover:bg-amber-50 focus:ring-amber-500"
                                                            leftIcon={
                                                                isRejecting ? (
                                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                ) : (
                                                                    <XIcon className="w-3.5 h-3.5" />
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
                                    <div className="text-[11px] text-gray-600">
                                        Loading driver info…
                                    </div>
                                )}

                                {claimsError && (
                                    <div className="rounded-md border border-red-200 bg-red-50 p-2 text-[11px] text-red-700">
                                        {claimsError}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Secondary info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 text-[11px] sm:text-xs text-gray-600">
                            <div className="flex items-center">
                                <MapPin className="w-3 h-3 mr-1.5 text-gray-400 shrink-0" />
                                <span className="truncate">{ride.from}</span>
                            </div>
                            <div className="flex items-center">
                                <MapPin className="w-3 h-3 mr-1.5 text-gray-400 shrink-0" />
                                <span className="truncate">{ride.to}</span>
                            </div>
                            <div className="flex items-center">
                                <Navigation className="w-3 h-3 mr-1.5 text-gray-400 shrink-0" />
                                <span className="truncate">{distanceText}</span>
                            </div>
                            <div className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1.5 text-gray-400 shrink-0" />
                                <span className="truncate">
                                    {etaText ? `ETA: ${etaText}` : "ETA: —"}
                                </span>
                            </div>
                        </div>

                        {/* Assigned driver */}
                        <div className="mt-1 sm:mt-2">
                            <AssignedDriverBadge
                                userId={ride.assignedDriverId as string | undefined}
                            />
                        </div>

                        {/* Actions */}
                        {!hideActions && (
                            <div className="mt-3 sm:mt-4 flex flex-col gap-3">
                                {showAssign && (
                                    <div
                                        className="w-full space-y-2"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <AssignDriverSelect
                                            rideId={ride._id}
                                            currentDriverId={ride.assignedDriverId || undefined}
                                            filters={{ limit: 50 }}
                                            onAssigned={(driverUserId) => {
                                                onDriverAssigned?.(driverUserId);
                                            }}
                                        />

                                        <Link
                                            href={`/rides/${ride._id}/assign`}
                                            className="w-full sm:w-auto block"
                                        >
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="w-full sm:w-auto text-xs"
                                                leftIcon={<Car className="w-3.5 h-3.5" />}
                                            >
                                                Advanced assign
                                            </Button>
                                        </Link>
                                    </div>
                                )}

                                {isPrivileged && (
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <RideShareQuickPanel rideId={ride._id} className="w-full" />
                                    </div>
                                )}

                                <div
                                    className="flex justify-center"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Link
                                        href={detailsHref || `/rides/${ride._id}`}
                                        className="w-full sm:w-auto"
                                    >
                                        <Button
                                            variant="outline"
                                            size="md"
                                            className="w-full sm:w-auto px-5 py-2 text-xs sm:text-sm font-medium flex items-center justify-center gap-2"
                                        >
                                            <Eye className="w-4 h-4" />
                                            <span>View ride details</span>
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardBody>
        </Card>
    );
}
