"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    ArrowUpDown,
    ChevronDown,
    ChevronUp,
    Filter,
    Layers,
    SlidersHorizontal,
    X,
} from "lucide-react";

import { Button, Typography } from "@/components/ui";
import RideSummaryCard from "@/components/ui/ride/RideSummaryCard";
import { Ride } from "@/types";
import { fmtDate, fmtTime, km, mins, money } from "@/services/convertors";
import {
    type RideStatus,
    getPillStatusColor,
    getStatusDotColor,
} from "@/types/rideStatus";

type ListModalState = {
    date: Date;
    title: string;
    rides: Ride[];
};

export type ListSortKey = "timeAsc" | "timeDesc" | "status" | "amountDesc";

type MultiRideModalProps = {
    listModal: ListModalState | null;
    listModalSelectedId: string | null;
    listSort: ListSortKey;
    isListMode: boolean;
    focusedListRide: Ride | null;
    listRides: Ride[];

    onClose: () => Promise<void> | void;
    onSelectRide: (rideId: string) => void;
    onBackToList: () => void;
    onChangeSort: (sort: ListSortKey) => void;
    onDriverAssigned: (rideId: string, driverUserId: string) => Promise<void> | void;
    onRideStatusChanged: (updatedRide: Ride) => void;
};

const STATUS_FILTER_OPTIONS: { key: RideStatus; label: string }[] = [
    { key: "unassigned", label: "Unassigned" },
    { key: "assigned", label: "Assigned" },
    { key: "on_my_way", label: "On my way" },
    { key: "on_location", label: "On location" },
    { key: "pob", label: "POB" },
    { key: "clear", label: "Clear" },
    { key: "completed", label: "Completed" },
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

function getStatusLabel(status: RideStatus): string {
    return String(status).replace(/_/g, " ");
}

function getSortLabel(sort: ListSortKey): string {
    switch (sort) {
        case "timeAsc":
            return "Time ↑";
        case "timeDesc":
            return "Time ↓";
        case "status":
            return "Status";
        case "amountDesc":
            return "Amount ↓";
        default:
            return sort;
    }
}

export default function MultiRideModal({
                                           listModal,
                                           listModalSelectedId,
                                           listSort,
                                           isListMode,
                                           focusedListRide,
                                           listRides,
                                           onClose,
                                           onSelectRide,
                                           onBackToList,
                                           onChangeSort,
                                           onDriverAssigned,
                                           onRideStatusChanged,
                                       }: MultiRideModalProps) {
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
    const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
    const [selectedStatuses, setSelectedStatuses] = useState<RideStatus[]>([]);
    const [pendingOnly, setPendingOnly] = useState(false);

    const statusDropdownRef = useRef<HTMLDivElement | null>(null);
    const sortDropdownRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                statusDropdownOpen &&
                statusDropdownRef.current &&
                !statusDropdownRef.current.contains(target)
            ) {
                setStatusDropdownOpen(false);
            }
            if (
                sortDropdownOpen &&
                sortDropdownRef.current &&
                !sortDropdownRef.current.contains(target)
            ) {
                setSortDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [statusDropdownOpen, sortDropdownOpen]);

    const visibleRides = useMemo(() => {
        if (!listModal) return [];

        let rides = listRides;
        const hasStatusFilters = selectedStatuses.length > 0;

        rides = rides.filter((r) => {
            const rideStatus = r.status as RideStatus;

            const pendingCount =
                (r as any).pendingClaimsCount ??
                ((r as any).hasPendingClaims ? 1 : 0);
            const hasPending =
                (r as any).hasPendingClaims === true || pendingCount > 0;

            if (hasStatusFilters && !selectedStatuses.includes(rideStatus)) {
                return false;
            }

            if (pendingOnly && !hasPending) {
                return false;
            }

            return true;
        });

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
    }, [listModal, listRides, selectedStatuses, pendingOnly, listSort]);

    const ridesCount = visibleRides.length;

    const toggleStatusFilter = (key: RideStatus) => {
        setSelectedStatuses((prev) =>
            prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key],
        );
    };

    const clearStatusFilters = () => {
        setSelectedStatuses([]);
    };

    const activeFilterCount =
        selectedStatuses.length + (pendingOnly ? 1 : 0);

    const statusSummary =
        selectedStatuses.length === 0
            ? "All statuses"
            : `${selectedStatuses.length} selected`;

    const handleBackdropClick = async () => {
        await onClose();
    };

    const handleCloseClick = async () => {
        await onClose();
    };

    if (!listModal) return null;

    return (
        <div
            className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40"
            onClick={handleBackdropClick}
        >
            <div
                className="w-full max-w-md max-h-[80vh] min-h-[60vh] rounded-t-2xl sm:rounded-2xl bg-white shadow-lg flex flex-col"
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
                                {isListMode ? listModal.title : "Ride details"}
                            </Typography>
                            <Typography className="text-[11px] sm:text-xs text-gray-500 truncate">
                                {isListMode
                                    ? `Showing ${ridesCount} ride${ridesCount === 1 ? "" : "s"}`
                                    : focusedListRide
                                        ? `${fmtDate(
                                            focusedListRide.datetime,
                                        )} • ${fmtTime(
                                            focusedListRide.datetime,
                                        )}`
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
                <div className="flex-1 max-h-full overflow-y-auto px-4 py-3 sm:px-6 sm:py-4 space-y-3">
                    {isListMode ? (
                        <>
                            {/* Filters (collapsible) */}
                            <div className="rounded-xl border border-gray-200 bg-gray-50/60">
                                <button
                                    type="button"
                                    className="flex w-full items-center justify-between px-3 py-2.5 sm:px-4"
                                    onClick={() =>
                                        setFiltersOpen((open) => !open)
                                    }
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                                            <Filter className="w-3.5 h-3.5" />
                                        </span>
                                        <div className="flex flex-col items-start">
                                            <span className="text-xs sm:text-sm font-medium text-gray-900">
                                                Filters
                                            </span>
                                            <span className="text-[10px] sm:text-[11px] text-gray-500">
                                                {activeFilterCount === 0
                                                    ? "No filters applied"
                                                    : `${activeFilterCount} filter${activeFilterCount > 1 ? "s" : ""} active`}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {activeFilterCount > 0 && (
                                            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                                                {activeFilterCount}
                                            </span>
                                        )}
                                        {filtersOpen ? (
                                            <ChevronUp className="w-4 h-4 text-gray-400" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4 text-gray-400" />
                                        )}
                                    </div>
                                </button>

                                {filtersOpen && (
                                    <div className="border-t border-gray-200 px-3 py-2.5 sm:px-4 sm:py-3 space-y-2.5">
                                        {/* Row 1: status filter (full-width, mobile-friendly) */}
                                        <div
                                            ref={statusDropdownRef}
                                            className="relative"
                                        >
                                            <div className="text-[11px] sm:text-xs mb-1 text-gray-600">
                                                Status
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setStatusDropdownOpen(
                                                        (open) => !open,
                                                    )
                                                }
                                                className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs sm:text-sm text-gray-700 hover:bg-gray-50"
                                            >
                                                <span className="inline-flex items-center gap-2">
                                                    <SlidersHorizontal className="w-4 h-4 text-gray-500" />
                                                    <span className="font-medium">
                                                        {statusSummary}
                                                    </span>
                                                </span>
                                                <ChevronDown className="w-4 h-4 text-gray-400" />
                                            </button>

                                            {statusDropdownOpen && (
                                                <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                                                    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                                                        <span className="text-[11px] font-medium text-gray-700">
                                                            Filter by status
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={
                                                                clearStatusFilters
                                                            }
                                                            className="text-[11px] text-indigo-600 hover:text-indigo-700"
                                                        >
                                                            Clear
                                                        </button>
                                                    </div>
                                                    <ul className="max-h-64 overflow-y-auto px-2 py-2 text-[11px] sm:text-xs">
                                                        {STATUS_FILTER_OPTIONS.map(
                                                            ({
                                                                 key,
                                                                 label,
                                                             }) => {
                                                                const checked =
                                                                    selectedStatuses.includes(
                                                                        key,
                                                                    );
                                                                const pillClasses =
                                                                    getPillStatusColor(
                                                                        key,
                                                                    );
                                                                const dotClasses =
                                                                    getStatusDotColor(
                                                                        key,
                                                                    );

                                                                return (
                                                                    <li
                                                                        key={
                                                                            key
                                                                        }
                                                                        className="px-1 py-1"
                                                                    >
                                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                                            <input
                                                                                type="checkbox"
                                                                                className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                                                checked={
                                                                                    checked
                                                                                }
                                                                                onChange={() =>
                                                                                    toggleStatusFilter(
                                                                                        key,
                                                                                    )
                                                                                }
                                                                            />
                                                                            <span
                                                                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] sm:text-[11px] ${pillClasses}`}
                                                                            >
                                                                                <span
                                                                                    className={`h-1.5 w-1.5 rounded-full ${dotClasses}`}
                                                                                />
                                                                                <span className="capitalize">
                                                                                    {label}
                                                                                </span>
                                                                            </span>
                                                                        </label>
                                                                    </li>
                                                                );
                                                            },
                                                        )}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>

                                        {/* Row 2: pending drivers checkbox (full-width row) */}
                                        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs sm:text-sm">
                                            <label className="flex items-center justify-between gap-3 cursor-pointer">
                                                <div className="flex items-start gap-2">
                                                    <input
                                                        type="checkbox"
                                                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                                        checked={pendingOnly}
                                                        onChange={(e) =>
                                                            setPendingOnly(
                                                                e.target
                                                                    .checked,
                                                            )
                                                        }
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-900">
                                                            Pending driver
                                                        </span>
                                                        <span className="text-[10px] sm:text-[11px] text-gray-500">
                                                            Show only rides that have at least one queued driver request
                                                        </span>
                                                    </div>
                                                </div>
                                            </label>
                                        </div>

                                        {/* Row 3: sort dropdown (full-width row) */}
                                        <div
                                            ref={sortDropdownRef}
                                            className="relative"
                                        >
                                            <div className="text-[11px] sm:text-xs mb-1 text-gray-600">
                                                Sort by
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setSortDropdownOpen(
                                                        (open) => !open,
                                                    )
                                                }
                                                className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs sm:text-sm text-gray-700 hover:bg-gray-50"
                                            >
                                                <span className="inline-flex items-center gap-2">
                                                    <ArrowUpDown className="w-4 h-4 text-gray-500" />
                                                    <span className="font-medium">
                                                        {getSortLabel(
                                                            listSort,
                                                        )}
                                                    </span>
                                                </span>
                                                <ChevronDown className="w-4 h-4 text-gray-400" />
                                            </button>

                                            {sortDropdownOpen && (
                                                <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                                                    <ul className="py-1 text-[11px] sm:text-xs">
                                                        {(
                                                            [
                                                                "timeAsc",
                                                                "timeDesc",
                                                                "status",
                                                                "amountDesc",
                                                            ] as ListSortKey[]
                                                        ).map((option) => {
                                                            const active =
                                                                option ===
                                                                listSort;
                                                            return (
                                                                <li
                                                                    key={
                                                                        option
                                                                    }
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        className={`flex w-full items-center px-3 py-1.5 text-left hover:bg-gray-50 ${
                                                                            active
                                                                                ? "text-indigo-600 font-medium"
                                                                                : "text-gray-700"
                                                                        }`}
                                                                        onClick={() => {
                                                                            onChangeSort(
                                                                                option,
                                                                            );
                                                                            setSortDropdownOpen(
                                                                                false,
                                                                            );
                                                                        }}
                                                                    >
                                                                        {getSortLabel(
                                                                            option,
                                                                        )}
                                                                    </button>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* List of rides */}
                            <div className="mt-2 rounded-lg border border-gray-200 divide-y divide-gray-100">
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

                                    const rideId = String(ride._id);

                                    const pendingCount =
                                        (ride as any).pendingClaimsCount ??
                                        ((ride as any).hasPendingClaims
                                            ? 1
                                            : 0);
                                    const hasPending =
                                        (ride as any).hasPendingClaims ===
                                        true || pendingCount > 0;

                                    const isSelected =
                                        listModalSelectedId &&
                                        rideId === listModalSelectedId;

                                    return (
                                        <button
                                            key={ride._id}
                                            type="button"
                                            onClick={() =>
                                                onSelectRide(rideId)
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

                                                <div className="shrink-0 inline-flex flex-col items-end gap-1">
                                                    {/* Status pill with red ping indicator when pending */}
                                                    <div className="relative">
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
                                                                {getStatusLabel(
                                                                    status,
                                                                )}
                                                            </span>
                                                        </span>

                                                        {hasPending && (
                                                            <span className="flex absolute -top-1 -right-1 h-2.5 w-2.5">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Optional subtle text for clarity */}
                                                    {hasPending && (
                                                        <span className="text-[9px] sm:text-[10px] text-red-600">
                                                            Pending driver
                                                        </span>
                                                    )}
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
                                    <Button size="sm" className="w-full">
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
