"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Layers, X } from "lucide-react";

import { Button, Typography } from "@/components/ui";
import { Ride } from "@/types";
import { fmtDate, fmtTime, km, mins, money } from "@/services/convertors";
import {
    type RideStatus,
    getPillStatusColor,
    getStatusDotColor,
} from "@/types/rideStatus";
import RideSummaryCard from "@/components/ui/ride/RideSummaryCard";

type ListModalState = {
    date: Date;
    title: string;
    rides: Ride[];
};

export type ListSortKey = "timeAsc" | "timeDesc" | "status" | "amountDesc";

type MultiRideModalProps = {
    listModal: ListModalState | null;
    listModalSelectedId: string | null;
    listFilterStatus: RideStatus | "all";
    listSort: ListSortKey;
    isListMode: boolean;
    focusedListRide: Ride | null;
    listRides: Ride[];

    onClose: () => Promise<void> | void;
    onSelectRide: (rideId: string) => void;
    onBackToList: () => void;
    onChangeFilterStatus: (status: RideStatus | "all") => void;
    onChangeSort: (sort: ListSortKey) => void;
    onDriverAssigned: (rideId: string, driverUserId: string) => Promise<void> | void;
    onRideStatusChanged: (updatedRide: Ride) => void;
};

const STATUS_FILTER_ORDER: (RideStatus | "all")[] = [
    "all",
    "unassigned",
    "assigned",
    "on_my_way",
    "on_location",
    "pob",
    "clear",
    "completed",
];

const STATUS_SORT_RANK: Record<RideStatus, number> = {
    unassigned: 1,
    assigned: 2,
    on_my_way: 3,
    on_location: 4,
    pob: 5,
    clear: 6,
    completed: 7,
};

export default function MultiRideModal({
                                           listModal,
                                           listModalSelectedId,
                                           listFilterStatus,
                                           listSort,
                                           isListMode,
                                           focusedListRide,
                                           listRides,
                                           onClose,
                                           onSelectRide,
                                           onBackToList,
                                           onChangeFilterStatus,
                                           onChangeSort,
                                           onDriverAssigned,
                                           onRideStatusChanged,
                                       }: MultiRideModalProps) {
    if (!listModal) return null;

    const visibleRides = useMemo(() => {
        let rides = listRides;

        if (listFilterStatus !== "all") {
            rides = rides.filter(
                (r) => (r.status as RideStatus) === listFilterStatus,
            );
        }

        const sorted = [...rides];

        const getTime = (r: Ride) => new Date(r.datetime).getTime();
        const getAmount = (r: Ride) => r.payment?.amountCents ?? 0;

        switch (listSort) {
            case "timeAsc":
                sorted.sort((a, b) => getTime(a) - getTime(b));
                break;
            case "timeDesc":
                sorted.sort((a, b) => getTime(b) - getTime(a));
                break;
            case "status":
                sorted.sort(
                    (a, b) =>
                        (STATUS_SORT_RANK[a.status as RideStatus] ?? 99) -
                        (STATUS_SORT_RANK[b.status as RideStatus] ?? 99),
                );
                break;
            case "amountDesc":
                sorted.sort((a, b) => getAmount(b) - getAmount(a));
                break;
            default:
                break;
        }

        return sorted;
    }, [listRides, listFilterStatus, listSort]);

    const ridesCount = visibleRides.length;

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
                    <div className="flex items-center gap-2 min-w-0">
                        {!isListMode && focusedListRide && (
                            <button
                                type="button"
                                onClick={onBackToList}
                                className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white p-1.5 text-gray-600 hover:bg-gray-50 hover:text-gray-800 shrink-0"
                                aria-label="Back to list"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        )}

                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-indigo-50 text-indigo-600 shrink-0">
                            <Layers className="w-4 h-4" />
                        </div>

                        <div className="min-w-0">
                            <Typography className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                                {isListMode
                                    ? listModal.title
                                    : "Ride details"}
                            </Typography>
                            <Typography className="text-[11px] sm:text-xs text-gray-500 truncate">
                                {isListMode
                                    ? `Showing ${ridesCount} ride${ridesCount === 1 ? "" : "s"}`
                                    : focusedListRide
                                        ? `${fmtDate(
                                            focusedListRide.datetime,
                                        )} • ${fmtTime(focusedListRide.datetime)}`
                                        : ""}
                            </Typography>
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
                <div className="max-h-[70vh] overflow-y-auto px-4 py-3 sm:px-6 sm:py-4 space-y-3">
                    {isListMode ? (
                        <>
                            {/* Filters + sort */}
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-[11px] sm:text-xs">
                                <div className="flex flex-wrap gap-1">
                                    {STATUS_FILTER_ORDER.map((status) => {
                                        const isActive =
                                            listFilterStatus === status;
                                        const label =
                                            status === "all"
                                                ? "All"
                                                : String(status).replace(
                                                    /_/g,
                                                    " ",
                                                );

                                        return (
                                            <button
                                                key={status}
                                                type="button"
                                                onClick={() =>
                                                    onChangeFilterStatus(
                                                        status,
                                                    )
                                                }
                                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${
                                                    isActive
                                                        ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                                                }`}
                                            >
                                                {status !== "all" && (
                                                    <span
                                                        className={`h-1.5 w-1.5 rounded-full ${getStatusDotColor(
                                                            status as RideStatus,
                                                        )}`}
                                                    />
                                                )}
                                                <span className="capitalize">
                                                    {label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex items-center gap-1 text-gray-500">
                                    <span>Sort:</span>
                                    <select
                                        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] sm:text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        value={listSort}
                                        onChange={(e) =>
                                            onChangeSort(
                                                e.target
                                                    .value as ListSortKey,
                                            )
                                        }
                                    >
                                        <option value="timeAsc">
                                            Time ↑
                                        </option>
                                        <option value="timeDesc">
                                            Time ↓
                                        </option>
                                        <option value="status">
                                            Status
                                        </option>
                                        <option value="amountDesc">
                                            Amount ↓
                                        </option>
                                    </select>
                                </div>
                            </div>

                            {/* List of rides */}
                            <div className="mt-1 rounded-lg border border-gray-200 divide-y divide-gray-100">
                                {visibleRides.length === 0 && (
                                    <div className="px-3 py-6 text-center text-xs sm:text-sm text-gray-500">
                                        No rides match current filters.
                                    </div>
                                )}

                                {visibleRides.map((ride) => {
                                    const status =
                                        ride.status as RideStatus;
                                    const hasAmount =
                                        !!ride.payment?.amountCents;
                                    const distance = km(ride.distance || 0);
                                    const duration =
                                        (ride as any).durationMinutes;
                                    const durationText = mins(
                                        duration || 0,
                                    );
                                    const amountText = hasAmount
                                        ? money(ride.payment!.amountCents)
                                        : null;

                                    const isSelected =
                                        listModalSelectedId &&
                                        String(ride._id) ===
                                        listModalSelectedId;

                                    return (
                                        <button
                                            key={ride._id}
                                            type="button"
                                            onClick={() =>
                                                onSelectRide(
                                                    String(ride._id),
                                                )
                                            }
                                            className={`w-full text-left px-3 py-2.5 sm:px-4 sm:py-3 hover:bg-gray-50 ${
                                                isSelected
                                                    ? "bg-indigo-50/60"
                                                    : ""
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1 text-[11px] sm:text-xs text-gray-500">
                                                        <span>
                                                            {fmtTime(
                                                                ride.datetime,
                                                            )}
                                                        </span>
                                                        <span>·</span>
                                                        <span className="truncate">
                                                            {fmtDate(
                                                                ride.datetime,
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="mt-0.5 text-xs sm:text-sm font-medium text-gray-900 truncate">
                                                        {ride.from} →{" "}
                                                        {ride.to}
                                                    </div>
                                                    <div className="mt-0.5 text-[11px] sm:text-xs text-gray-500 truncate">
                                                        {amountText ||
                                                            distance}
                                                        {durationText &&
                                                            ` • ${durationText}`}
                                                    </div>
                                                </div>

                                                <div className="shrink-0 inline-flex items-center">
                                                    <span
                                                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] sm:text-xs font-medium ${getPillStatusColor(
                                                            status,
                                                        )}`}
                                                    >
                                                        <span
                                                            className={`h-2 w-2 rounded-full ${getStatusDotColor(
                                                                status,
                                                            )}`}
                                                        />
                                                        <span className="capitalize">
                                                            {String(
                                                                status,
                                                            ).replace(
                                                                /_/g,
                                                                " ",
                                                            )}
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        focusedListRide && (
                            <RideSummaryCard
                                ride={focusedListRide}
                                onDriverAssigned={(driverUserId) =>
                                    onDriverAssigned(
                                        String(focusedListRide._id),
                                        driverUserId,
                                    )
                                }
                                onStatusChanged={onRideStatusChanged}
                            />
                        )
                    )}
                </div>

                {/* Footer */}
                <div className="border-t px-4 py-3 sm:px-6 sm:py-4 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center sm:justify-between">
                    {focusedListRide && !isListMode && (
                        <div className="text-[11px] sm:text-xs text-gray-500">
                            {fmtDate(focusedListRide.datetime)} •{" "}
                            {fmtTime(focusedListRide.datetime)}
                        </div>
                    )}

                    <div className="flex gap-2 justify-end w-full">
                        {focusedListRide && !isListMode && (
                            <>
                                <Link
                                    href={`/rides/${focusedListRide._id}`}
                                    className="w-full sm:w-auto"
                                >
                                    <Button
                                        size="sm"
                                        className="w-full"
                                    >
                                        Open full ride
                                    </Button>
                                </Link>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full sm:w-auto"
                                    onClick={onBackToList}
                                >
                                    Back to list
                                </Button>
                            </>
                        )}

                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full sm:w-auto"
                            onClick={handleCloseClick}
                        >
                            Close
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
