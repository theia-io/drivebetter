// app/customer-rides/page.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Container, Typography } from "@/components/ui";
import { useAuthStore } from "@/stores";
import { useCustomerRides } from "@/stores/customers";
import { Ride } from "@/types";
import { type RideStatus, getStatusLabel } from "@/types/rideStatus";
import RidesFilters, { SortKey } from "@/components/ride/RidesFilters";
import CustomerRideCard from "@/components/ride/cards/CustomerRideCard";

export default function CustomerRidesPage() {
    const { user } = useAuthStore();
    const userId = user?._id;

    const [statusFilter, setStatusFilter] = useState<RideStatus | "all">("all");
    const [dateFrom, setDateFrom] = useState<string>("");
    const [dateTo, setDateTo] = useState<string>("");
    const [sortBy, setSortBy] = useState<SortKey>("dateDesc");
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [pendingOnly, setPendingOnly] = useState(false);

    const {
        data: rawRides,
        isLoading,
        error,
    } = useCustomerRides(userId, {
        enabled: !!userId,
        page: 1,
        limit: 100,
    });

    const rides: Ride[] = useMemo(() => {
        let list: Ride[] = [...rawRides];

        if (statusFilter !== "all") {
            list = list.filter((r) => r.status === statusFilter);
        }

        if (dateFrom) {
            const fromTs = new Date(`${dateFrom}T00:00:00.000Z`).getTime();
            list = list.filter(
                (r) => new Date(r.datetime).getTime() >= fromTs,
            );
        }
        if (dateTo) {
            const toTs = new Date(`${dateTo}T23:59:59.999Z`).getTime();
            list = list.filter(
                (r) => new Date(r.datetime).getTime() <= toTs,
            );
        }

        if (pendingOnly) {
            list = list.filter((ride: any) => {
                const pendingCount =
                    ride.pendingClaimsCount ?? (ride.hasPendingClaims ? 1 : 0);
                return ride.hasPendingClaims === true || pendingCount > 0;
            });
        }

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
    }, [rawRides, statusFilter, dateFrom, dateTo, sortBy, pendingOnly]);

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
                                My rides
                            </Typography>
                            <Typography
                                variant="body1"
                                className="text-gray-600 mt-0.5 sm:mt-2 text-xs sm:text-base"
                            >
                                Rides you requested as a customer.
                            </Typography>
                        </div>
                        <div className="shrink-0 p-4">
                            <Link
                                href={
                                    userId
                                        ? `/rides/new?customerId=${encodeURIComponent(
                                            userId,
                                        )}`
                                        : "/rides/new"
                                }
                            >
                                <Button
                                    size="sm"
                                    colorScheme={"success"}
                                    className="inline-flex items-center gap-2"
                                >
                                    <span className="text-sm font-semibold">
                                        + Create ride
                                    </span>
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* FILTERS */}
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

                    {/* LIST */}
                    <div className="space-y-2 sm:space-y-4">
                        {isLoading && (
                            <div className="text-sm text-gray-500">
                                Loading your rides…
                            </div>
                        )}
                        {error && !isLoading && (
                            <div className="text-sm text-red-600">
                                Failed to load your rides.
                            </div>
                        )}
                        {!isLoading && !error && rides.length === 0 && (
                            <div className="text-sm text-gray-500">
                                You have no rides yet.
                            </div>
                        )}

                        {rides.map((ride: Ride) => (
                            <CustomerRideCard key={ride._id} ride={ride} />
                        ))}
                    </div>
                </div>
            </Container>
        </ProtectedLayout>
    );
}
