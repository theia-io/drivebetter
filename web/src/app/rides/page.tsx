"use client";

import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Container, Typography } from "@/components/ui";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRidesInfinite } from "@/stores/rides";
import { Ride } from "@/types";
import { useAuthStore } from "@/stores";
import RideSummaryCard from "@/components/ui/ride/RideSummaryCard";
import { type RideStatus, getStatusLabel } from "@/types/rideStatus";
import RidesFilters, { SortKey } from "@/components/ui/ride/RidesFilters";

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

    // client-side filter: only rides with pending driver requests
    const [pendingOnly, setPendingOnly] = useState(false);

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
        // potential driver-specific filter can go here later
        return p;
    }, [dateFrom, dateTo, statusFilter]);

    const { items, size, setSize, isLoading, reachedEnd, mutate } = useRidesInfinite(params, 20);

    // refetch when backend filters change
    useEffect(() => {
        setSize(1);
        mutate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateFrom, dateTo, statusFilter]);

    // client-side sort + pending filter
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

        if (!pendingOnly) {
            return list;
        }

        return list.filter((ride: any) => {
            const pendingCount = ride.pendingClaimsCount ?? (ride.hasPendingClaims ? 1 : 0);
            return ride.hasPendingClaims === true || pendingCount > 0;
        });
    }, [items, sortBy, pendingOnly]);

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
                        <div className="shrink-0">
                            <Link href="/rides/new">
                                <Button size="sm" className="inline-flex items-center gap-2">
                                    <span className="text-sm font-semibold">+ Create ride</span>
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* FILTERS (new design, aligned with MultiRideModal) */}
                    <RidesFilters
                        statusFilter={statusFilter}
                        dateFrom={dateFrom}
                        dateTo={dateTo}
                        sortBy={sortBy}
                        filtersOpen={filtersOpen}
                        ridesCount={rides.length}
                        pendingOnly={pendingOnly}
                        onToggleOpen={() => setFiltersOpen((v) => !v)}
                        onChangeStatusFilter={setStatusFilter}
                        onChangeDateFrom={setDateFrom}
                        onChangeDateTo={setDateTo}
                        onChangeSortBy={setSortBy}
                        onChangePendingOnly={setPendingOnly}
                    />

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
