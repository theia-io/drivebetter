"use client";

import { X } from "lucide-react";

import { Button, Typography } from "@/components/ui";
import RideSummaryCard from "@/components/ride/cards/RideSummaryCard";
import { Ride } from "@/types";
import { type RideStatus, getPillStatusColor, getStatusDotColor } from "@/types/rideStatus";

type RideDetailsModalProps = {
    ride: Ride | null;
    onClose: () => Promise<void> | void;
    onDriverAssigned: (rideId: string, driverUserId: string) => Promise<void> | void;
    onRideStatusChanged: (updatedRide: Ride) => void;
};

export default function RideDetailsModal({
    ride,
    onClose,
    onDriverAssigned,
    onRideStatusChanged,
}: RideDetailsModalProps) {
    if (!ride) return null;

    const status = ride.status as RideStatus;

    const handleBackdropClick = async () => {
        await onClose();
    };

    const handleCloseClick = async () => {
        await onClose();
    };

    return (
        <div
            className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40"
            onClick={handleBackdropClick}
        >
            <div
                className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-lg"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between gap-2 border-b px-4 py-3 sm:px-6 sm:py-4">
                    <div className="min-w-0">
                        <Typography className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                            Ride preview
                        </Typography>
                        <div className="mt-1 inline-flex items-center gap-2 text-[11px] sm:text-xs text-gray-500">
                            <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] sm:text-xs font-medium ${getPillStatusColor(
                                    status
                                )}`}
                            >
                                <span
                                    className={`mr-1 h-2 w-2 rounded-full ${getStatusDotColor(
                                        status
                                    )}`}
                                />
                                <span className="capitalize">
                                    {String(status).replace(/_/g, " ")}
                                </span>
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleCloseClick}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 shrink-0"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="max-h-[70vh] overflow-y-auto px-4 py-3 sm:px-6 sm:py-4">
                    <RideSummaryCard
                        ride={ride}
                        onDriverAssigned={(driverUserId) =>
                            onDriverAssigned(String(ride._id), driverUserId)
                        }
                        onStatusChanged={onRideStatusChanged}
                    />
                </div>

                {/* Footer */}
                <div className="border-t px-4 py-3 sm:px-6 sm:py-4 flex justify-end">
                    <Button variant="ghost" size="sm" onClick={handleCloseClick}>
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
}
