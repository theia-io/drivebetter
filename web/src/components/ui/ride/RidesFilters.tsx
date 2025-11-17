"use client";

import { Card, CardBody, Typography } from "@/components/ui";
import { Filter, ChevronDown } from "lucide-react";
import {
    type RideStatus,
    getPillStatusColor,
    getStatusDotColor,
    getStatusLabel,
} from "@/types/rideStatus";

export type SortKey = "dateDesc" | "dateAsc" | "status" | "amountDesc";

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

type RidesFiltersProps = {
    statusFilter: RideStatus | "all";
    dateFrom: string;
    dateTo: string;
    sortBy: SortKey;
    filtersOpen: boolean;
    ridesCount: number;

    onToggleOpen: () => void;
    onChangeStatusFilter: (value: RideStatus | "all") => void;
    onChangeDateFrom: (value: string) => void;
    onChangeDateTo: (value: string) => void;
    onChangeSortBy: (value: SortKey) => void;
};

export default function RidesFilters({
                                         statusFilter,
                                         dateFrom,
                                         dateTo,
                                         sortBy,
                                         filtersOpen,
                                         ridesCount,
                                         onToggleOpen,
                                         onChangeStatusFilter,
                                         onChangeDateFrom,
                                         onChangeDateTo,
                                         onChangeSortBy,
                                     }: RidesFiltersProps) {
    const statusSummary =
        statusFilter === "all"
            ? "All statuses"
            : getStatusLabel(statusFilter as RideStatus);

    const dateSummary =
        !dateFrom && !dateTo
            ? "Any date"
            : `${dateFrom || "…"} → ${dateTo || "…"}`;

    const sortSummary = (() => {
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
    })();

    return (
        <Card variant="elevated">
            <CardBody className="p-0">
                {/* HEADER ROW (always visible, very compact) */}
                <button
                    type="button"
                    onClick={onToggleOpen}
                    className="w-full flex items-center justify-between gap-2 px-3 sm:px-4 py-2 sm:py-3"
                >
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-600" />
                        <div className="flex flex-col items-start">
                            <span className="text-xs sm:text-sm font-medium text-gray-900">
                                Filters
                            </span>
                            <span className="text-[11px] text-gray-500">
                                {statusSummary} · {dateSummary} · {sortSummary}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="hidden sm:inline text-[11px] text-gray-500">
                            {ridesCount} ride{ridesCount !== 1 ? "s" : ""}
                        </span>
                        <span
                            className={`inline-flex items-center justify-center rounded-full border border-gray-200 bg-white p-1 transition-transform ${
                                filtersOpen ? "rotate-180" : ""
                            }`}
                        >
                            <ChevronDown className="w-4 h-4 text-gray-600" />
                        </span>
                    </div>
                </button>

                {/* BODY (collapsible) */}
                {filtersOpen && (
                    <div className="border-t border-gray-100 px-3 sm:px-4 py-3 sm:py-4 space-y-3">
                        {/* STATUS PILLS – horizontal scroll on mobile */}
                        <div className="space-y-1">
                            <span className="text-[11px] font-medium text-gray-700">
                                Status
                            </span>
                            <div className="-mx-1 overflow-x-auto">
                                <div className="flex gap-2 px-1 pb-1">
                                    {STATUS_FILTERS.map((value) => {
                                        const active = statusFilter === value;

                                        if (value === "all") {
                                            return (
                                                <button
                                                    key="all"
                                                    type="button"
                                                    onClick={() =>
                                                        onChangeStatusFilter(
                                                            "all",
                                                        )
                                                    }
                                                    className={`inline-flex items-center px-3 py-1.5 rounded-full border text-[11px] font-medium whitespace-nowrap ${
                                                        active
                                                            ? "bg-gray-900 text-white border-gray-900"
                                                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                                    }`}
                                                >
                                                    All
                                                </button>
                                            );
                                        }

                                        const pillClass = getPillStatusColor(
                                            value as RideStatus,
                                        );
                                        const dotClass = getStatusDotColor(
                                            value as RideStatus,
                                        );

                                        return (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() =>
                                                    onChangeStatusFilter(value)
                                                }
                                                className={`inline-flex items-center px-3 py-1.5 rounded-full border text-[11px] font-medium whitespace-nowrap ${pillClass} ${
                                                    active
                                                        ? "ring-2 ring-offset-1 ring-gray-900/40"
                                                        : ""
                                                }`}
                                            >
                                                <span
                                                    className={`mr-1 h-2 w-2 rounded-full ${dotClass}`}
                                                />
                                                <span className="capitalize">
                                                    {getStatusLabel(
                                                        value as RideStatus,
                                                    )}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* SORT */}
                        <div className="space-y-1">
                            <span className="text-[11px] font-medium text-gray-700">
                                Sort
                            </span>
                            <select
                                value={sortBy}
                                onChange={(e) =>
                                    onChangeSortBy(
                                        e.target.value as SortKey,
                                    )
                                }
                                className="w-full sm:w-60 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="dateDesc">Newest first</option>
                                <option value="dateAsc">Oldest first</option>
                                <option value="status">By status</option>
                                <option value="amountDesc">
                                    Price high → low
                                </option>
                            </select>
                        </div>

                        {/* DATE RANGE */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                                    From date
                                </label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) =>
                                        onChangeDateFrom(e.target.value)
                                    }
                                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                                    To date
                                </label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) =>
                                        onChangeDateTo(e.target.value)
                                    }
                                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </CardBody>
        </Card>
    );
}
