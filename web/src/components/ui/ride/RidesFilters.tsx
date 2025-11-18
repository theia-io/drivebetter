"use client";

import { useEffect, useRef, useState } from "react";
import {
    Filter,
    ChevronDown,
    ChevronUp,
    SlidersHorizontal,
    ArrowUpDown,
} from "lucide-react";

import { Typography } from "@/components/ui";
import {
    type RideStatus,
    getPillStatusColor,
    getStatusDotColor,
    getStatusLabel,
} from "@/types/rideStatus";

export type SortKey = "dateDesc" | "dateAsc" | "status" | "amountDesc";

type RidesFiltersProps = {
    statusFilter: RideStatus | "all";
    dateFrom: string;
    dateTo: string;
    sortBy: SortKey;
    filtersOpen: boolean;
    ridesCount: number;
    pendingOnly: boolean;

    onToggleOpen: () => void;
    onChangeStatusFilter: (value: RideStatus | "all") => void;
    onChangeDateFrom: (value: string) => void;
    onChangeDateTo: (value: string) => void;
    onChangeSortBy: (value: SortKey) => void;
    onChangePendingOnly: (value: boolean) => void;
};

const STATUS_FILTERS: (RideStatus | "all")[] = [
    "all",
    "unassigned",
    "assigned",
    "on_my_way",
    "on_location",
    "pob",
    "clear",
    "completed",
];

function getSortLabel(sortBy: SortKey): string {
    switch (sortBy) {
        case "dateDesc":
            return "Newest first";
        case "dateAsc":
            return "Oldest first";
        case "status":
            return "By status";
        case "amountDesc":
            return "Price high → low";
        default:
            return "";
    }
}

export default function RidesFilters({
                                         statusFilter,
                                         dateFrom,
                                         dateTo,
                                         sortBy,
                                         filtersOpen,
                                         ridesCount,
                                         pendingOnly,
                                         onToggleOpen,
                                         onChangeStatusFilter,
                                         onChangeDateFrom,
                                         onChangeDateTo,
                                         onChangeSortBy,
                                         onChangePendingOnly,
                                     }: RidesFiltersProps) {
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
    const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

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

    const statusSummary =
        statusFilter === "all"
            ? "All statuses"
            : getStatusLabel(statusFilter as RideStatus);

    const dateSummary =
        !dateFrom && !dateTo
            ? "Any date"
            : `${dateFrom || "…"} → ${dateTo || "…"}`;

    const sortSummary = getSortLabel(sortBy);

    const activeFilterCount =
        (statusFilter !== "all" ? 1 : 0) +
        (dateFrom || dateTo ? 1 : 0) +
        (pendingOnly ? 1 : 0);

    return (
        <div className="rounded-xl border border-gray-200 bg-gray-50/60">
            {/* HEADER (collapsible) */}
            <button
                type="button"
                onClick={onToggleOpen}
                className="flex w-full items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3"
            >
                <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                        <Filter className="w-4 h-4" />
                    </span>
                    <div className="flex flex-col items-start">
                        <Typography className="text-xs sm:text-sm font-semibold text-gray-900">
                            Filters
                        </Typography>
                        <span className="text-[10px] sm:text-[11px] text-gray-500">
                            {statusSummary} · {dateSummary} · {sortSummary}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="hidden sm:inline text-[11px] text-gray-500">
                        {ridesCount} ride{ridesCount !== 1 ? "s" : ""}
                    </span>
                    {activeFilterCount > 0 && (
                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                            {activeFilterCount} active
                        </span>
                    )}
                    {filtersOpen ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                </div>
            </button>

            {/* BODY (collapsible, MultiRideModal-style; each control full-width row) */}
            {filtersOpen && (
                <div className="border-t border-gray-200 px-3 py-3 sm:px-4 sm:py-4 space-y-3">
                    {/* Row 1: Status filter (dropdown) */}
                    <div ref={statusDropdownRef} className="relative">
                        <div className="mb-1 text-[11px] sm:text-xs text-gray-600">
                            Status
                        </div>
                        <button
                            type="button"
                            onClick={() =>
                                setStatusDropdownOpen((open) => !open)
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
                            <div className="absolute z-40 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                                    <span className="text-[11px] font-medium text-gray-700">
                                        Filter by status
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onChangeStatusFilter("all")
                                        }
                                        className="text-[11px] text-indigo-600 hover:text-indigo-700"
                                    >
                                        Reset
                                    </button>
                                </div>
                                <ul className="max-h-64 overflow-y-auto px-2 py-2 text-[11px] sm:text-xs">
                                    {STATUS_FILTERS.map((value) => {
                                        const active =
                                            statusFilter === value;

                                        if (value === "all") {
                                            return (
                                                <li
                                                    key="all"
                                                    className="px-1 py-1"
                                                >
                                                    <button
                                                        type="button"
                                                        className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left ${
                                                            active
                                                                ? "bg-gray-100 text-gray-900 font-medium"
                                                                : "text-gray-700 hover:bg-gray-50"
                                                        }`}
                                                        onClick={() => {
                                                            onChangeStatusFilter(
                                                                "all",
                                                            );
                                                            setStatusDropdownOpen(
                                                                false,
                                                            );
                                                        }}
                                                    >
                                                        <span>All statuses</span>
                                                    </button>
                                                </li>
                                            );
                                        }

                                        const pillClass =
                                            getPillStatusColor(
                                                value as RideStatus,
                                            );
                                        const dotClass =
                                            getStatusDotColor(
                                                value as RideStatus,
                                            );

                                        return (
                                            <li
                                                key={value}
                                                className="px-1 py-1"
                                            >
                                                <button
                                                    type="button"
                                                    className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left ${
                                                        active
                                                            ? "bg-gray-100 text-gray-900 font-medium"
                                                            : "text-gray-700 hover:bg-gray-50"
                                                    }`}
                                                    onClick={() => {
                                                        onChangeStatusFilter(
                                                            value,
                                                        );
                                                        setStatusDropdownOpen(
                                                            false,
                                                        );
                                                    }}
                                                >
                                                    <span
                                                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] sm:text-[11px] ${pillClass}`}
                                                    >
                                                        <span
                                                            className={`h-1.5 w-1.5 rounded-full ${dotClass}`}
                                                        />
                                                        <span className="capitalize">
                                                            {getStatusLabel(
                                                                value as RideStatus,
                                                            )}
                                                        </span>
                                                    </span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Row 2: Pending drivers checkbox (full-width) */}
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs sm:text-sm">
                        <label className="flex items-start gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                checked={pendingOnly}
                                onChange={(e) =>
                                    onChangePendingOnly(e.target.checked)
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
                        </label>
                    </div>

                    {/* Row 3: Date range (full-width row, stacked inputs on mobile) */}
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs sm:text-sm space-y-2">
                        <div className="text-[11px] sm:text-xs text-gray-600 mb-0.5">
                            Date range
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[10px] sm:text-[11px] font-medium text-gray-700 mb-1">
                                    From
                                </label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) =>
                                        onChangeDateFrom(e.target.value)
                                    }
                                    className="w-full rounded-md border border-gray-300 px-2 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] sm:text-[11px] font-medium text-gray-700 mb-1">
                                    To
                                </label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) =>
                                        onChangeDateTo(e.target.value)
                                    }
                                    className="w-full rounded-md border border-gray-300 px-2 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Row 4: Sort dropdown (full-width row) */}
                    <div ref={sortDropdownRef} className="relative">
                        <div className="mb-1 text-[11px] sm:text-xs text-gray-600">
                            Sort by
                        </div>
                        <button
                            type="button"
                            onClick={() =>
                                setSortDropdownOpen((open) => !open)
                            }
                            className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs sm:text-sm text-gray-700 hover:bg-gray-50"
                        >
                            <span className="inline-flex items-center gap-2">
                                <ArrowUpDown className="w-4 h-4 text-gray-500" />
                                <span className="font-medium">
                                    {getSortLabel(sortBy)}
                                </span>
                            </span>
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                        </button>

                        {sortDropdownOpen && (
                            <div className="absolute z-40 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                                <ul className="py-1 text-[11px] sm:text-xs">
                                    {(
                                        [
                                            "dateDesc",
                                            "dateAsc",
                                            "status",
                                            "amountDesc",
                                        ] as SortKey[]
                                    ).map((option) => {
                                        const active = option === sortBy;
                                        return (
                                            <li key={option}>
                                                <button
                                                    type="button"
                                                    className={`flex w-full items-center px-3 py-1.5 text-left hover:bg-gray-50 ${
                                                        active
                                                            ? "text-indigo-600 font-medium"
                                                            : "text-gray-700"
                                                    }`}
                                                    onClick={() => {
                                                        onChangeSortBy(option);
                                                        setSortDropdownOpen(
                                                            false,
                                                        );
                                                    }}
                                                >
                                                    {getSortLabel(option)}
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
    );
}
