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
    X as XIcon,
} from "lucide-react";

import { useAuthStore } from "@/stores";
import { useRide, useSetRideStatus } from "@/stores/rides";
import { fmtDate, fmtTime } from "@/services/convertors";
import {
    getStatusColors,
    getStatusLabel,
    type RideStatus,
} from "@/types/rideStatus";

const ACTIVE_MODE_FLOW: RideStatus[] = [
    "assigned",
    "on_my_way",
    "on_location",
    "pob",
    "clear",
    "completed",
];

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
        case "clear":
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

    // basic guards
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

    const currentIdx = ACTIVE_MODE_FLOW.indexOf(statusValue);
    const activeButtons =
        currentIdx >= 0 ? ACTIVE_MODE_FLOW.slice(currentIdx) : ACTIVE_MODE_FLOW;

    return (
        <ProtectedLayout>
            <div className="flex min-h-screen flex-col bg-black text-white">
                {/* Top bar with speed-dial style exit */}
                <div className="flex items-center justify-between px-4 pt-4 pb-3">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/rides/${id}`)}
                            leftIcon={<ArrowLeft className="w-4 h-4 text-white" />}
                            className="border-white/40 bg-white/10 text-xs text-white hover:bg-white/20"
                        >
                            Back to normal view
                        </Button>
                    </div>
                    <div className="relative">
                        {/* main FAB to exit */}
                        <button
                            type="button"
                            onClick={() => router.push(`/rides/${id}`)}
                            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-600 shadow-xl focus:outline-none focus:ring-2 focus:ring-red-400"
                            aria-label="Exit Active Mode"
                        >
                            <XIcon className="w-6 h-6 text-white" />
                        </button>
                        {/* label */}
                        <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 rounded-md bg-white/10 px-2 py-1 text-[11px] text-white/90">
                            Exit Active Mode
                        </div>
                    </div>
                </div>

                {/* Ride header / key details */}
                <div className="px-4 pb-3">
                    <div className="text-xs uppercase tracking-wide text-gray-400">
                        Active ride
                    </div>
                    <div className="mt-1 text-lg font-semibold leading-snug">
                        {ride.from} → {ride.to}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-300">
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
                </div>

                {/* Customer & address block */}
                <div className="px-4">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-2 text-sm sm:text-base">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
                                    <span className="text-xs font-semibold text-white">
                                        {ride.customer.name?.[0] || "C"}
                                    </span>
                                </span>
                                <span className="font-medium">
                                    {ride.customer.name || "Customer"}
                                </span>
                            </div>
                            {ride.customer.phone && (
                                <a
                                    href={`tel:${ride.customer.phone}`}
                                    className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow-md active:scale-[0.97]"
                                >
                                    <PhoneIcon className="w-3.5 h-3.5" />
                                    Call
                                </a>
                            )}
                        </div>
                        <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 mt-0.5 text-gray-400" />
                            <div>
                                <div className="text-[11px] uppercase tracking-wide text-gray-400">
                                    Pickup
                                </div>
                                <div className="text-sm">{ride.from || "—"}</div>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 mt-0.5 text-gray-400" />
                            <div>
                                <div className="text-[11px] uppercase tracking-wide text-gray-400">
                                    Drop-off
                                </div>
                                <div className="text-sm">{ride.to || "—"}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status buttons */}
                <div className="mt-4 flex-1 px-4 pb-6">
                    <div className="mb-2 text-[11px] uppercase tracking-wide text-gray-400">
                        Status actions
                    </div>

                    <div className="flex flex-col gap-2">
                        {activeButtons.map((status) => {
                            const { bg, border, text } = getStatusColors(status);
                            const isCurrent = status === statusValue;
                            const shortCode = getStatusShortCode(status);
                            const label = getStatusLabel(status);

                            const disabled =
                                isSettingStatus || status === statusValue;

                            return (
                                <button
                                    key={status}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => handleStatusChange(status)}
                                    className={[
                                        "w-full rounded-2xl px-4 py-3 sm:py-4 text-left shadow-md active:scale-[0.97] transition-transform border",
                                        bg,
                                        border,
                                        text,
                                        isCurrent
                                            ? "ring-2 ring-offset-2 ring-offset-black"
                                            : "",
                                        disabled
                                            ? "opacity-70 cursor-not-allowed"
                                            : "cursor-pointer",
                                    ].join(" ")}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex flex-col">
                                            <span className="text-xs uppercase tracking-wide opacity-80">
                                                {shortCode || "Status"}
                                            </span>
                                            <span className="text-base sm:text-lg font-semibold capitalize">
                                                {label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isCurrent && (
                                                <span className="inline-flex items-center rounded-full bg-black/10 px-2 py-1 text-[11px]">
                                                    Current
                                                </span>
                                            )}
                                            {isSettingStatus &&
                                                status === statusValue && (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </ProtectedLayout>
    );
}
