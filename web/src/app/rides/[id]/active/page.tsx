// app/rides/[id]/active/page.tsx
"use client";

import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Typography } from "@/components/ui";
import { ArrowLeft, Calendar, Clock, Loader2, MapPin, Navigation, PhoneIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";

import RideStatusStepper from "@/components/ui/ride/RideStatusStepper";
import { fmtDate, fmtTime } from "@/services/convertors";
import { useAuthStore } from "@/stores";
import { useRide, useSetRideStatus } from "@/stores/rides";
import {
    getStatusColors,
    getStatusLabel,
    getStatusShortCode,
    type RideStatus
} from "@/types/rideStatus";

const ACTIVE_MODE_FLOW: RideStatus[] = ["assigned", "on_my_way", "on_location", "pob", "completed"];

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

    // Active mode is only for an assigned, in-progress ride
    const isActiveModeAvailable =
        !!ride && isAssignedDriver && ride.status !== "unassigned" && ride.status !== "completed";

    async function handleStatusChange(next: RideStatus) {
        if (!ride || !isActiveModeAvailable) return;
        if (next === statusValue) return;

        const res = await setRideStatus({ status: next });
        if (res?.ok) await mutate();
    }

    // --- Loading state: full-screen overlay ---
    if (isLoading || !ride) {
        return (
            <ProtectedLayout>
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-50">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading ride…
                    </div>
                </div>
            </ProtectedLayout>
        );
    }

    // --- Guard: no active mode (not assigned / not in progress) ---
    if (!isActiveModeAvailable) {
        return (
            <ProtectedLayout>
                <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-gray-50 px-4">
                    <Typography className="text-lg font-semibold text-gray-900 mb-1 text-center">
                        Active Mode not available
                    </Typography>
                    <p className="text-sm text-gray-600 mb-4 text-center max-w-sm">
                        Active Mode can only be used by the assigned driver while the ride is in
                        progress.
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
            </ProtectedLayout>
        );
    }

    // --- Main Active Ride full-screen layout ---
    return (
        <ProtectedLayout>
            {/* Full-screen overlay: hides app header / side / bottom nav visually */}
            <div className="fixed inset-0 z-40 flex flex-col bg-gray-50">
                {/* Top bar: vibrant, clearly Active Ride mode */}
                <div className="flex items-center gap-3 px-4 py-3 shadow-md bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white">
                    <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<ArrowLeft className="w-4 h-4" />}
                        onClick={() => router.push(`/rides/${id}`)}
                        className="border-white/80 bg-white/10 hover:bg-white/20 text-xs font-semibold"
                    >
                        Back
                    </Button>
                    <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-[0.14em] font-semibold text-white/90">
                            Active ride mode
                        </div>
                        <div className="text-sm sm:text-base font-semibold truncate">
                            {ride.from} → {ride.to}
                        </div>
                    </div>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 sm:space-y-5">
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

                    {/* Big status buttons – full flow, can go back, clear colors */}
                    <div className="pb-6">
                        <div className="mb-2 text-[11px] uppercase tracking-wide text-gray-500">
                            Status actions
                        </div>

                        <div className="flex flex-col gap-2">
                            {ACTIVE_MODE_FLOW.map((status) => {
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
                                        className="w-full rounded-2xl px-4 py-7 text-center shadow-sm border transition-transform active:scale-[0.97] flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                                        style={{
                                            backgroundColor: isCurrent ? bg : "#ffffff",
                                            borderColor: border,
                                            color: text,
                                        }}
                                    >
                                        <div className="flex flex-col items-center justify-center w-full">
                                            <span className="text-lg sm:text-2xl font-semibold capitalize leading-tight">
                                                {label}
                                            </span>
                                            {isCurrent && (
                                                <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide opacity-90">
                                                    Active
                                                </span>
                                            )}
                                            {isSettingStatus && status === statusValue && (
                                                <Loader2 className="mt-1 w-5 h-5 animate-spin" />
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedLayout>
    );
}
