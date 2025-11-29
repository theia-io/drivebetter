"use client";

import { Button } from "@/components/ui";
import {
    ArrowRight,
    Check,
    Clock,
    Loader2,
    MapPin,
    XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useQueueRideClaim } from "@/stores/rideClaims";

type DriverInboxItem = {
    ride: {
        _id: string;
        from: string;
        to: string;
        datetime: string | Date;
    };
    shareId?: string;
    visibility?: string;
    maxClaims?: number;
    expiresAt?: string | Date;
    myClaim?: {
        status?: string;
        createdAt?: string | Date;
    };
};

type SharedRideRequestCardProps = {
    item: DriverInboxItem;
    /**
     * "available" – rides you can request
     * "claimed"   – rides already assigned to this driver
     */
    context: "available" | "claimed";
    /**
     * Optional hook for parent to refresh lists after a successful request.
     */
    onAfterRequest?: () => void | Promise<void>;
};

type CardStatus = "available" | "requested" | "denied" | "assigned";

function deriveStatus(item: DriverInboxItem, context: "available" | "claimed"): CardStatus {
    if (context === "claimed") return "assigned";

    const s = item.myClaim?.status;
    if (!s) return "available";

    const normalized = s.toLowerCase();
    if (normalized === "queued" || normalized === "pending") return "requested";
    if (normalized === "denied" || normalized === "rejected") return "denied";
    if (normalized === "approved" || normalized === "assigned") return "assigned";

    return "available";
}

function statusStyles(status: CardStatus) {
    switch (status) {
        case "requested":
            return {
                wrapper: "bg-amber-50 border-amber-200",
                badge: "bg-amber-100 border-amber-200 text-amber-800",
                badgeText: "Requested",
            };
        case "denied":
            return {
                wrapper: "bg-red-50 border-red-200",
                badge: "bg-red-100 border-red-200 text-red-800",
                badgeText: "Request denied",
            };
        case "assigned":
            return {
                wrapper: "bg-emerald-50 border-emerald-200",
                badge: "bg-emerald-100 border-emerald-200 text-emerald-800",
                badgeText: "Assigned to you",
            };
        case "available":
        default:
            return {
                wrapper: "bg-white border-gray-200",
                badge: "bg-gray-100 border-gray-200 text-gray-700",
                badgeText: "Available",
            };
    }
}

export default function SharedRideRequestCard({
                                                  item,
                                                  context,
                                                  onAfterRequest,
                                              }: SharedRideRequestCardProps) {
    const dt = new Date(item.ride.datetime);
    const status = deriveStatus(item, context);
    const styles = statusStyles(status);

    const { queue, isQueuing } = useQueueRideClaim();
    const [localQueued, setLocalQueued] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const canRequest =
        context === "available" &&
        !!item.shareId &&
        status === "available" &&
        !localQueued;

    async function handleRequest() {
        if (!item.shareId || !canRequest) return;
        setLocalError(null);
        try {
            await queue(item.shareId);
            setLocalQueued(true);
            if (onAfterRequest) {
                await onAfterRequest();
            }
        } catch (e) {
            setLocalError((e as Error).message);
        }
    }

    const effectiveStatus: CardStatus =
        localQueued && status === "available" ? "requested" : status;
    const effectiveStyles =
        effectiveStatus === status ? styles : statusStyles(effectiveStatus);

    const requested =
        effectiveStatus === "requested" || effectiveStatus === "assigned";
    const denied = effectiveStatus === "denied";

    const requestButtonLabel =
        effectiveStatus === "available"
            ? "Request ride"
            : effectiveStatus === "requested"
                ? "Requested"
                : effectiveStatus === "denied"
                    ? "Request denied"
                    : "Already assigned";

    const requestButtonDisabled =
        context !== "available" ||
        !item.shareId ||
        isQueuing ||
        requested ||
        denied;

    return (
        <div
            className={`rounded-lg border p-3 sm:p-4 ${effectiveStyles.wrapper}`}
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                {/* Left: ride info */}
                <div className="min-w-0 space-y-1.5">
                    <div className="text-xs text-gray-500 flex items-center gap-1.5">
                        <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${effectiveStyles.badge}`}
                        >
                            {effectiveStyles.badgeText}
                        </span>
                        {item.visibility && (
                            <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] text-gray-700 capitalize">
                                {item.visibility}
                            </span>
                        )}
                    </div>

                    <div className="flex items-start gap-2 text-sm text-gray-700">
                        <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-[2px]" />
                        <span className="truncate">
                            <span className="font-medium">From:</span>{" "}
                            {item.ride.from}
                        </span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-gray-700">
                        <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-[2px]" />
                        <span className="truncate">
                            <span className="font-medium">To:</span>{" "}
                            {item.ride.to}
                        </span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-gray-700">
                        <Clock className="w-4 h-4 text-gray-400 shrink-0 mt-[2px]" />
                        <span title={dt.toISOString()}>
                            {dt.toLocaleDateString()} •{" "}
                            {dt.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </span>
                    </div>

                    {/* Metadata row, single-line chunks */}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
                        {typeof item.maxClaims === "number" && (
                            <span>max claims: {item.maxClaims}</span>
                        )}
                        {item.expiresAt && (
                            <span>
                                expires:{" "}
                                {new Date(
                                    item.expiresAt,
                                ).toLocaleString()}
                            </span>
                        )}
                    </div>

                    {localError && (
                        <div className="mt-1 flex items-start gap-1.5 text-[11px] text-red-700">
                            <XCircle className="w-3.5 h-3.5 mt-[1px]" />
                            <span>{localError}</span>
                        </div>
                    )}
                </div>

                {/* Right: actions – stacked on mobile */}
                <div className="flex flex-col gap-2 w-full sm:w-auto sm:items-end">
                    <Link href={`/rides/${item.ride._id}`} className="w-full sm:w-auto">
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto"
                            rightIcon={<ArrowRight className="w-4 h-4" />}
                        >
                            Details
                        </Button>
                    </Link>

                    {/* Request / state button */}
                    {context === "available" && (
                        <Button
                            size="sm"
                            className="w-full sm:w-auto"
                            onClick={handleRequest}
                            disabled={requestButtonDisabled}
                            leftIcon={
                                effectiveStatus === "requested" ||
                                effectiveStatus === "assigned" ? (
                                    <Check className="w-4 h-4" />
                                ) : denied ? (
                                    <XCircle className="w-4 h-4" />
                                ) : isQueuing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : undefined
                            }
                        >
                            {requestButtonLabel}
                        </Button>
                    )}

                    {context === "claimed" && (
                        <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1 w-full sm:w-auto text-center">
                            Assigned to you
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
