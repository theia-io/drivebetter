"use client";

import Link from "next/link";
import {useEffect, useMemo, useState} from "react";
import {
    Calendar,
    Car,
    Clock,
    DollarSign,
    MapPin,
    Navigation,
    User,
    Eye,
    ChevronDown,
} from "lucide-react";
import {Button, Card, CardBody, Typography} from "@/components/ui";
import {Ride, RideCreatorUser} from "@/types";
import {fmtDate, fmtTime, km, mins, money} from "@/services/convertors";
import AssignedDriverBadge from "@/components/ui/ride/AssignedDriverBadge";
import RideCreatorBadge from "@/components/ui/ride/RideCreatorBadge";
import {useAuthStore} from "@/stores";
import AssignDriverSelect from "@/components/ui/ride/AssignDriverSelect";
import RideShareQuickPanel from "@/components/ui/ride/RideShareQuickPanel";
import RideStatusDropdown from "@/components/ui/ride/RideStatusDropdown";
import RideStatusStepper from "@/components/ui/ride/RideStatusStepper";
import {getPillStatusColor, getStatusDotColor, getStatusLabel, type RideStatus} from "@/types/rideStatus";
import {useSetRideStatus} from "@/stores/rides";

type RideSummaryCardProps = {
    ride: Ride;
    /** Optional custom href for "Details" button. Defaults to `/rides/:id`. */
    detailsHref?: string;
    /** Hide the footer actions (Details/Assign/Share). Defaults to false. */
    hideActions?: boolean;
    /** Called when driver has been successfully assigned via the select. */
    onDriverAssigned?: (driverUserId: string) => void;
    /** Called when status was successfully changed (for calendar, stats, etc.). */
    onStatusChanged?: (updatedRide: Ride) => void;

    /**
     * Visual mode:
     * - "card"      – current behaviour, always fully expanded.
     * - "accordion" – compact header + expandable details (preferred for mobile lists).
     */
    variant?: "card" | "accordion";

    /**
     * Only used when variant === "accordion".
     * Controls initial expanded state (defaults to false).
     */
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
    const {user} = useAuthStore();
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

    const {setRideStatus, isSettingStatus} = useSetRideStatus(ride._id);

    const rideDate = fmtDate(ride.datetime);
    const rideTime = fmtTime(ride.datetime);
    const distanceText = km(ride.distance);
    const etaText = mins((ride as any).durationMinutes);
    const amountText = money(ride.payment?.amountCents);

    // local status state for immediate visual update
    const [localStatus, setLocalStatus] = useState<RideStatus>(
        (ride.status as RideStatus) || "unassigned",
    );

    // keep local status in sync if parent gives a new ride.status
    useEffect(() => {
        setLocalStatus((ride.status as RideStatus) || "unassigned");
    }, [ride.status]);

    const statusValue: RideStatus = localStatus;
    const statusLabel = getStatusLabel(statusValue);

    // use local status for UI logic (driver select visibility)
    const showAssign = isPrivileged && statusValue === "unassigned";

    // accordion open/close state
    const [expanded, setExpanded] = useState<boolean>(
        variant === "card" ? true : defaultExpanded,
    );

    useEffect(() => {
        // card mode is always expanded
        if (variant === "card") {
            setExpanded(true);
        }
    }, [variant]);

    // optimistic update: change local status immediately, then call API and notify parent
    async function handleStatusChange(next: RideStatus): Promise<void> {
        if (!next || next === localStatus) return;

        const prev = localStatus;
        setLocalStatus(next);

        try {
            await setRideStatus({status: next});

            onStatusChanged?.({
                ...(ride as Ride),
                status: next,
            });
        } catch {
            setLocalStatus(prev);
        }
    }

    const isAccordion = variant === "accordion";

    return (
        <Card
            variant="elevated"
            className={`transition-shadow ${
                isAccordion ? "hover:shadow-md" : "hover:shadow-lg"
            }`}
        >
            <CardBody className="p-0">
                {/* HEADER – compact, always visible */}
                <button
                    type="button"
                    className="w-full flex items-start gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-4"
                    onClick={() => {
                        if (!isAccordion) return;
                        setExpanded((v) => !v);
                    }}
                >
                    {/* Left icon */}
                    <div
                        className="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600"/>
                    </div>

                    {/* Center summary */}
                    <div className="min-w-0 flex-1 space-y-1 text-left">
                        <Typography className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                            {ride.from} → {ride.to}
                        </Typography>

                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs text-gray-600">
                            <span className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3 text-gray-400"/>
                                <span className="font-medium">
                                    {rideDate} · {rideTime}
                                </span>
                            </span>
                            {amountText && (
                                <span className="inline-flex items-center gap-1">
                                    <DollarSign className="w-3 h-3 text-gray-400"/>
                                    <span>{amountText}</span>
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-gray-400"/>
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

                    {/* Right: status + chevron (in accordion mode) */}
                    <div className="flex flex-col items-end gap-1 shrink-0 pl-1">
    <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium border ${getPillStatusColor(
            statusValue,
        )}`}
    >
        <span
            className={`mr-1 h-2 w-2 rounded-full ${getStatusDotColor(
                statusValue,
            )}`}
        />
        <span className="capitalize">{statusLabel}</span>
    </span>

                        {isAccordion && (
                            <span
                                className={`inline-flex items-center justify-center rounded-full border border-gray-200 bg-white p-1 ${
                                    expanded ? "rotate-180" : ""
                                } transition-transform`}
                            >
            <ChevronDown className="w-4 h-4 text-gray-500"/>
        </span>
                        )}
                    </div>
                </button>

                {/* DETAILS – hidden when collapsed in accordion mode */}
                {expanded && (
                    <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3 sm:space-y-4 border-t border-gray-100">
                        {/* Progress stepper – lifecycle visualization */}
                        <div className="pt-3">
                            <RideStatusStepper value={statusValue}/>
                            <div className="mt-1 text-[11px] text-gray-600">
                                Current: <span className="font-semibold">{statusLabel}</span>
                            </div>
                        </div>

                        {/* Status control */}
                        {canChangeStatus && (
                            <div
                                className="mt-1"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <RideStatusDropdown
                                    value={statusValue}
                                    disabled={isSettingStatus}
                                    onChange={handleStatusChange}
                                    className="w-full"
                                />
                            </div>
                        )}

                        {/* Secondary info grid */}
                        <div
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 text-[11px] sm:text-xs text-gray-600">
                            <div className="flex items-center">
                                <MapPin className="w-3 h-3 mr-1.5 text-gray-400 shrink-0"/>
                                <span className="truncate">{ride.from}</span>
                            </div>
                            <div className="flex items-center">
                                <MapPin className="w-3 h-3 mr-1.5 text-gray-400 shrink-0"/>
                                <span className="truncate">{ride.to}</span>
                            </div>
                            <div className="flex items-center">
                                <Navigation className="w-3 h-3 mr-1.5 text-gray-400 shrink-0"/>
                                <span className="truncate">{distanceText}</span>
                            </div>
                            <div className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1.5 text-gray-400 shrink-0"/>
                                <span className="truncate">
                                    {etaText ? `ETA: ${etaText}` : "ETA: —"}
                                </span>
                            </div>
                        </div>

                        {/* Assigned driver badge */}
                        <div className="mt-1 sm:mt-2">
                            <AssignedDriverBadge
                                userId={ride.assignedDriverId as string | undefined}
                            />
                        </div>

                        {/* Actions */}
                        {!hideActions && (
                            <div className="mt-3 sm:mt-4 flex flex-col gap-3">
                                {/* Assign driver (only when status is unassigned) */}
                                {showAssign && (
                                    <div
                                        className="w-full space-y-2"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <AssignDriverSelect
                                            rideId={ride._id}
                                            currentDriverId={
                                                ride.assignedDriverId || undefined
                                            }
                                            filters={{limit: 50}}
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
                                                leftIcon={<Car className="w-3.5 h-3.5"/>}
                                            >
                                                Advanced assign
                                            </Button>
                                        </Link>
                                    </div>
                                )}

                                {/* Quick share – full row; only for privileged roles */}
                                {isPrivileged && (
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <RideShareQuickPanel
                                            rideId={ride._id}
                                            className="w-full"
                                        />
                                    </div>
                                )}

                                {/* Centered Details button */}
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
                                            <Eye className="w-4 h-4"/>
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
