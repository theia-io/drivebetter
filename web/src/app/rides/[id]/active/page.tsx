// app/rides/[id]/active/page.tsx
"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Container, Typography } from "@/components/ui";
import {
    ArrowLeft,
    Calendar,
    Clock,
    Loader2,
    MapPin,
    Navigation,
    PhoneIcon,
} from "lucide-react";

import { useAuthStore } from "@/stores";
import { useRide, useSetRideStatus } from "@/stores/rides";
import { fmtDate, fmtTime } from "@/services/convertors";
import {
    getStatusColors,
    getStatusLabel,
    type RideStatus, STATUS_FLOW,
} from "@/types/rideStatus";
import RideStatusStepper from "@/components/ui/ride/RideStatusStepper";


function getStatusShortCode(status: RideStatus): string {
    switch (status) {
        case "unassigned":
            return "U";
        case "assigned":
            return "A";
        case "on_my_way":
            return "OW";
        case "on_location":
            return "OL";
        case "pob":
            return "PoB";
        case "completed":
            return "C";
        default:
            return "";
    }
}

export default function RideActivePage() {
    const { user } = useAuthStore();
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const { data: ride, isLoading, mutate } = useRide(id);
    const { setRideStatus, isSettingStatus } = useSetRideStatus(id);

    const isAssignedDriver = useMemo(() => {
        if (!ride || !user?._id || !ride.assignedDriverId) return false;
        return String(ride.assignedDriverId) === String(user._id);
    }, [ride, user?._id]);

    const statusValue: RideStatus = (ride?.status as RideStatus) || "unassigned";
    const isActiveModeAvailable =
        !!ride &&
        isAssignedDriver &&
        ride.status !== "unassigned" &&
        ride.status !== "completed";

    async function handleStatusChange(next: RideStatus) {
        if (!ride || !isActiveModeAvailable) return;
        if (next === statusValue) return;

        const res = await setRideStatus({ status: next });
        if (res?.ok) await mutate();
    }

    // loading / guards
    if (isLoading || !ride) {
        return (
            <ProtectedLayout>
                <Container className="px-3 sm:px-6 lg:px-8">
                    <div className="py-8 text-sm text-gray-600 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading ride…
                    </div>
                </Container>
            </ProtectedLayout>
        );
    }

    if (!isActiveModeAvailable) {
        return (
            <ProtectedLayout>
                <Container className="px-3 sm:px-6 lg:px-8">
                    <div className="py-8 space-y-3">
                        <Typography className="text-lg font-semibold text-gray-900">
                            Active Mode not available
                        </Typography>
                        <p className="text-sm text-gray-600">
                            Active Mode can only be used by the assigned driver while the ride is
                            in progress.
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<ArrowLeft className="w-4 h-4" />}
                            onClick={() => router.push(`/rides/${id}`)}
                        >
                            Back to ride details
                        </Button>
                    </div>
                </Container>
            </ProtectedLayout>
        );
    }

    return (
        <ProtectedLayout>
            <Container className="px-3 sm:px-6 lg:px-8">
                <div className="min-h-screen py-3 sm:py-4 space-y-4 sm:space-y-6">
                    {/* Compact top bar – single back action, no duplicated exit */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<ArrowLeft className="w-4 h-4" />}
                            onClick={() => router.push(`/rides/${id}`)}
                        >
                            Back
                        </Button>
                        <div className="min-w-0">
                            <div className="text-xs uppercase tracking-wide text-gray-500">
                                Active ride
                            </div>
                            <div className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                                {ride.from} → {ride.to}
                            </div>
                        </div>
                    </div>

                    {/* Ride summary + status stepper */}
                    <div className="space-y-3">
                        {/* Ride details card */}
                        <div className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex flex-col">
                                    <span className="text-xs uppercase tracking-wide text-gray-500">
                                        Ride details
                                    </span>
                                    <span className="text-sm font-medium text-gray-900">
                                        {ride.customer.name || "Customer"}
                                    </span>
                                </div>
                                {ride.customer.phone && (
                                    <a
                                        href={`tel:${ride.customer.phone}`}
                                        className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow-sm active:scale-[0.97]"
                                    >
                                        <PhoneIcon className="w-3.5 h-3.5" />
                                        Call
                                    </a>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-700">
                                <span className="inline-flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    {fmtDate(ride.datetime)}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    {fmtTime(ride.datetime)}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <Navigation className="w-4 h-4 text-gray-400" />
                                    {ride.type}
                                </span>
                            </div>

                            <div className="mt-2 space-y-1 text-sm text-gray-800">
                                <div className="flex items-start gap-2">
                                    <MapPin className="w-4 h-4 mt-0.5 text-gray-400" />
                                    <div>
                                        <div className="text-[11px] uppercase tracking-wide text-gray-500">
                                            Pickup
                                        </div>
                                        <div>{ride.from || "—"}</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <MapPin className="w-4 h-4 mt-0.5 text-gray-400" />
                                    <div>
                                        <div className="text-[11px] uppercase tracking-wide text-gray-500">
                                            Drop-off
                                        </div>
                                        <div>{ride.to || "—"}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stepper – always visible, reflects current status */}
                        <div className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-xs uppercase tracking-wide text-gray-500">
                                    Ride status
                                </span>
                                <span className="text-xs font-semibold text-gray-800 capitalize">
                                    {getStatusLabel(statusValue)}
                                </span>
                            </div>
                            <RideStatusStepper value={statusValue} />
                        </div>
                    </div>

                    {/* Big status buttons – full flow, can go back, color from status map */}
                    <div className="pb-6">
                        <div className="mb-2 text-[11px] uppercase tracking-wide text-gray-500">
                            Status actions
                        </div>

                        <div className="flex flex-col gap-2">
                            {STATUS_FLOW.map((status) => {
                                const { bg, border, text } = getStatusColors(status);
                                const isCurrent = status === statusValue;
                                const shortCode = getStatusShortCode(status);
                                const label = getStatusLabel(status);

                                const disabled = isSettingStatus;

                                return (
                                    <button
                                        key={status}
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => handleStatusChange(status)}
                                        className={[
                                            "w-full rounded-2xl px-4 py-4 sm:py-5 text-left shadow-sm border transition-transform active:scale-[0.97]",
                                            isCurrent ? "border-2" : "border",
                                            disabled ? "cursor-not-allowed" : "cursor-pointer",
                                        ].join(" ")}
                                        style={{
                                            // active: filled with status color; inactive: white with colored border
                                            backgroundColor: isCurrent ? bg : "#ffffff",
                                            borderColor: border,
                                            color: text,
                                        }}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex flex-col">
                                                <span className="text-xs uppercase tracking-wide">
                                                    {shortCode || "Status"}
                                                </span>
                                                <span className="text-base sm:text-lg font-semibold capitalize">
                                                    {label}
                                                </span>
                                            </div>
                                            {isSettingStatus && status === statusValue && (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </Container>
        </ProtectedLayout>
    );
}
