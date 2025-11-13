"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
    Calendar,
    Car,
    Clock,
    DollarSign,
    MapPin,
    Navigation,
    User,
} from "lucide-react";
import { Button, Card, CardBody, Typography } from "@/components/ui";
import { Ride, RideCreatorUser } from "@/types";
import { fmtDate, fmtTime, km, mins, money } from "@/services/convertors";
import AssignedDriverBadge from "@/components/ui/ride/AssignedDriverBadge";
import RideCreatorBadge from "@/components/ui/ride/RideCreatorBadge";
import { useAuthStore } from "@/stores";
import AssignDriverSelect from "@/components/ui/ride/AssignDriverSelect";

type RideSummaryCardProps = {
    ride: Ride;
    /**
     * Optional custom href for "Details" button.
     * Defaults to `/rides/:id`.
     */
    detailsHref?: string;
    /**
     * If provided, clicking anywhere on the card (except buttons) will call this.
     * Useful for calendar preview.
     */
    onCardClick?: () => void;
    /**
     * Hide the footer actions (Details/Assign). Defaults to false.
     */
    hideActions?: boolean;
    /**
     * Called when driver has been successfully assigned via the select.
     * Receives the newly assigned driverUserId.
     */
    onDriverAssigned?: (driverUserId: string) => void;
};

/* ---------------- Status decorators ---------------- */

function getStatusColor(status: string) {
    switch (status) {
        case "completed":
            return "bg-green-100 text-green-800 border-green-200";
        case "assigned":
        case "on_my_way":
        case "on_location":
        case "pob":
        case "clear":
            return "bg-blue-100 text-blue-800 border-blue-200";
        case "unassigned":
            return "bg-yellow-100 text-yellow-800 border-yellow-200";
        default:
            return "bg-gray-100 text-gray-800 border-gray-200";
    }
}

function getStatusIcon(status: string) {
    switch (status) {
        case "completed":
            return <Car className="w-3.5 h-3.5" />;
        case "assigned":
        case "on_my_way":
        case "on_location":
        case "pob":
        case "clear":
            return <Navigation className="w-3.5 h-3.5" />;
        case "unassigned":
            return <Clock className="w-3.5 h-3.5" />;
        default:
            return <Car className="w-3.5 h-3.5" />;
    }
}

/* ---------------- Component ---------------- */

export default function RideSummaryCard({
                                            ride,
                                            detailsHref,
                                            onCardClick,
                                            hideActions = false,
                                            onDriverAssigned,
                                        }: RideSummaryCardProps) {
    const { user } = useAuthStore();
    const roles = user?.roles ?? [];

    const isAdmin = roles.includes("admin");
    const isDispatcher = roles.includes("dispatcher");

    const isCreator = useMemo(() => {
        if (!ride.creatorId || !user?._id) return false;
        // creatorId is populated as { _id, name, email, phone }
        return (ride.creatorId as RideCreatorUser)._id === String(user._id);
    }, [ride.creatorId, user?._id]);

    const isPrivileged = isAdmin || isDispatcher || isCreator;

    const rideDate = fmtDate(ride.datetime);
    const rideTime = fmtTime(ride.datetime);
    const distanceText = km(ride.distance);
    const etaText = mins((ride as any).durationMinutes);
    const amountText = money(ride.payment?.amountCents);

    const showAssign = isPrivileged && ride.status === "unassigned";

    const statusColor = getStatusColor(ride.status);

    return (
        <Card
            variant="elevated"
            className="hover:shadow-lg transition-shadow cursor-pointer"
        >
            <div className="p-3 sm:p-4">
                <CardBody className="p-0 space-y-3 sm:space-y-4">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                            </div>
                            <div className="min-w-0 space-y-1">
                                <Typography className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                                    {ride.from} → {ride.to}
                                </Typography>

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

                                {/* Creator */}
                                <div className="mt-0.5">
                                    <RideCreatorBadge creator={ride.creatorId as RideCreatorUser | undefined} />
                                </div>
                            </div>
                        </div>

                        {/* Status pill */}
                        <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-medium border ${statusColor}`}
                        >
                            {getStatusIcon(ride.status)}
                            <span className="ml-1 capitalize">
                                {ride.status.replace(/_/g, " ")}
                            </span>
                        </span>
                    </div>

                    {/* Secondary info row */}
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

                    {/* Assigned driver badge row */}
                    <div className="mt-1 sm:mt-2">
                        <AssignedDriverBadge
                            userId={ride.assignedDriverId as string | undefined}
                        />
                    </div>

                    {/* Actions */}
                    {!hideActions && (
                        <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2">
                            <Link href={detailsHref || `/rides/${ride._id}`} className="w-full sm:w-auto">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full sm:w-auto text-xs"
                                >
                                    Details
                                </Button>
                            </Link>

                            {showAssign && (
                                <div className="w-full sm:w-auto space-y-1">
                                    <AssignDriverSelect
                                        rideId={ride._id}
                                        currentDriverId={ride.assignedDriverId || undefined}
                                        filters={{
                                            limit: 50,
                                        }}
                                        onAssigned={(driverUserId) => {
                                            onDriverAssigned?.(driverUserId);
                                        }}
                                    />
                                    <Link href={`/rides/${ride._id}/assign`} className="w-full sm:w-auto">
                                        <Button
                                            size="sm"
                                            className="w-full sm:w-auto text-xs"
                                            leftIcon={<Car className="w-3.5 h-3.5" />}
                                        >
                                            Advanced assign
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </CardBody>
            </div>
        </Card>
    );
}
