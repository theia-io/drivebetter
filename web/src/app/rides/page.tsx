"use client";

import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import { ChevronDown, Filter, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRidesInfinite } from "@/stores/rides";
import { Ride } from "@/types";
import { useAuthStore } from "@/stores";
import RideSummaryCard from "@/components/ui/ride/RideSummaryCard";
import {
    type RideStatus,
    getPillStatusColor,
    getStatusDotColor,
    getStatusLabel,
} from "@/types/rideStatus";

type SortKey = "dateDesc" | "dateAsc" | "status" | "amountDesc";

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

export default function RidesPage() {
    const { user } = useAuthStore();
    const roles = user?.roles ?? [];
    const isDriver = roles.includes("driver");

    // backend filters
    const [statusFilter, setStatusFilter] = useState<RideStatus | "all">("all");
    const [dateFrom, setDateFrom] = useState<string>("");
    const [dateTo, setDateTo] = useState<string>("");

    // client-side sort
    const [sortBy, setSortBy] = useState<SortKey>("dateDesc");

    // accordion open/closed
    const [filtersOpen, setFiltersOpen] = useState(false);

    // build params for /rides list endpoint
    const params = useMemo(() => {
        const p: any = {};
        if (dateFrom) {
            p.from = new Date(`${dateFrom}T00:00:00.000Z`).toISOString();
        }
        if (dateTo) {
            p.to = new Date(`${dateTo}T23:59:59.999Z`).toISOString();
        }
        if (statusFilter !== "all") {
            p.status = statusFilter;
        }
        // if you ever want only "my created" for drivers, you can add user filter here
        return p;
    }, [dateFrom, dateTo, statusFilter]);

    const { items, size, setSize, isLoading, reachedEnd, mutate } =
        useRidesInfinite(params, 20);

    // refetch when backend filters change
    useEffect(() => {
        setSize(1);
        mutate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateFrom, dateTo, statusFilter]);

    // client-side sort
    const rides: Ride[] = useMemo(() => {
        const list = [...items];

        list.sort((a, b) => {
            const da = new Date(a.datetime).getTime();
            const db = new Date(b.datetime).getTime();

            switch (sortBy) {
                case "dateAsc":
                    return da - db;
                case "dateDesc":
                    return db - da;
                case "status": {
                    const sa = getStatusLabel(a.status as RideStatus);
                    const sb = getStatusLabel(b.status as RideStatus);
                    return sa.localeCompare(sb);
                }
                case "amountDesc": {
                    const ca = a.payment?.amountCents || 0;
                    const cb = b.payment?.amountCents || 0;
                    return cb - ca;
                }
                default:
                    return 0;
            }
        });

        return list;
    }, [items, sortBy]);

    // small summary text for collapsed header
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
        <ProtectedLayout>
            <Container className="px-3 sm:px-6 lg:px-8">
                <div className="space-y-4 sm:space-y-8 pb-20 sm:pb-0">
                    {/* HEADER */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <Typography
                                variant="h1"
                                className="text-xl sm:text-3xl font-bold text-gray-900 truncate"
                            >
                                Rides
                            </Typography>
                            <Typography
                                variant="body1"
                                className="text-gray-600 mt-0.5 sm:mt-2 text-xs sm:text-base"
                            >
                                Browse and manage rides you work with
                            </Typography>
                        </div>
                    </div>

                    {/* FILTERS ACCORDION */}
                    <Card variant="elevated">
                        <CardBody className="p-0">
                            {/* HEADER ROW (always visible, very compact) */}
                            <button
                                type="button"
                                onClick={() => setFiltersOpen((v) => !v)}
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
                                        {rides.length} ride
                                        {rides.length !== 1 ? "s" : ""}
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
                                                    const active =
                                                        statusFilter === value;

                                                    if (value === "all") {
                                                        return (
                                                            <button
                                                                key="all"
                                                                type="button"
                                                                onClick={() =>
                                                                    setStatusFilter("all")
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

                                                    const pillClass =
                                                        getPillStatusColor(
                                                            value as RideStatus,
                                                        );
                                                    const dotClass =
                                                        getStatusDotColor(
                                                            value as RideStatus,
                                                        );

                                                    return (
                                                        <button
                                                            key={value}
                                                            type="button"
                                                            onClick={() =>
                                                                setStatusFilter(value)
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
                                                setSortBy(e.target.value as SortKey)
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
                                                    setDateFrom(e.target.value)
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
                                                    setDateTo(e.target.value)
                                                }
                                                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    {/* RIDES LIST */}
                    <div className="space-y-2 sm:space-y-4">
                        {rides.length === 0 && !isLoading && (
                            <div className="text-sm text-gray-500">
                                No rides match current filters.
                            </div>
                        )}

                        {rides.map((ride: Ride) => (
                            <RideSummaryCard
                                key={ride._id}
                                ride={ride}
                                variant="accordion"
                                defaultExpanded={false}
                                onDriverAssigned={() => {
                                    mutate();
                                }}
                                onStatusChanged={() => {
                                    mutate();
                                }}
                            />
                        ))}
                    </div>

                    {/* LOAD MORE */}
                    <div className="sticky bottom-3 sm:static sm:bottom-auto">
                        <div className="text-center">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full sm:w-auto"
                                onClick={() => setSize(size + 1)}
                                disabled={isLoading || reachedEnd}
                            >
                                {reachedEnd
                                    ? "No More Rides"
                                    : isLoading
                                        ? "Loading..."
                                        : "Load More Rides"}
                            </Button>
                        </div>
                    </div>
                </div>
            </Container>
        </ProtectedLayout>
    );
}
