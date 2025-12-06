"use client";

import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Container, Typography } from "@/components/ui";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {useRouter, useSearchParams} from "next/navigation";
import { useRidesInfinite } from "@/stores/rides";
import { Ride } from "@/types";
import { useAuthStore } from "@/stores";
import RideSummaryCard from "@/components/ride/cards/RideSummaryCard";
import { type RideStatus, getStatusLabel } from "@/types/rideStatus";
import RidesFilters, { SortKey } from "@/components/ride/RidesFilters";
import { useMyCustomers, type MyCustomer } from "@/stores/customers";
import { User as UserIcon, Mail, Phone } from "lucide-react";

export default function RidesPage() {
    const { user } = useAuthStore();
    const router = useRouter();
    const roles = user?.roles ?? [];
    const isDriver = roles.includes("driver");

    const searchParams = useSearchParams();
    const customerId = searchParams?.get("customerId") || "";
    const isCustomerFiltered = Boolean(customerId);

    const isCustomer = roles.includes("customer");

    const isCustomerOnly = isCustomer && !isDriver;

    // hard guard: customer-only users should not be here
    useEffect(() => {
        if (isCustomerOnly) {
            router.replace("/customer-rides");
        }
    }, [isCustomerOnly, router]);

    const { data: customers } = useMyCustomers();

    const customer: MyCustomer | undefined = useMemo(() => {
        if (!isCustomerFiltered || !customers) return undefined;
        return customers.find((c: MyCustomer) => c.user?._id === customerId);
    }, [customers, customerId, isCustomerFiltered]);

    const customerName =
        customer?.user?.name ||
        customer?.user?.email ||
        "Customer";
    const customerEmail = customer?.user?.email || "";
    const customerPhone = customer?.user?.phone || "";

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

    // build params for /rides list endpoint, including optional customerId
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
        if (isCustomerFiltered) {
            p.customerId = customerId;
        }
        // potential driver-specific filter can go here later
        return p;
    }, [dateFrom, dateTo, statusFilter, isCustomerFiltered, customerId]);

    const { items, size, setSize, isLoading, reachedEnd, mutate } =
        useRidesInfinite(params, 20);

    // refetch when backend filters (or customerId) change
    useEffect(() => {
        setSize(1);
        mutate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateFrom, dateTo, statusFilter, customerId]);

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
            const pendingCount =
                ride.pendingClaimsCount ?? (ride.hasPendingClaims ? 1 : 0);
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
                                {isCustomerFiltered ? "Customer rides" : "Rides"}
                            </Typography>
                            <Typography
                                variant="body1"
                                className="text-gray-600 mt-0.5 sm:mt-2 text-xs sm:text-base"
                            >
                                {isCustomerFiltered
                                    ? "Browse and manage rides for the selected customer."
                                    : "Browse and manage rides you work with"}
                            </Typography>
                        </div>
                        <div className="shrink-0 p-4">
                            <Link
                                href={
                                    isCustomerFiltered
                                        ? `/rides/new?customerId=${encodeURIComponent(
                                            customerId,
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

                    {/* CUSTOMER CONTEXT BANNER (when filtered by customerId) */}
                    {isCustomerFiltered && (
                        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-3 py-3 sm:px-4 sm:py-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100">
                                        <UserIcon className="h-4 w-4 text-indigo-700" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="truncate text-sm font-semibold text-gray-900">
                                                {customerName}
                                            </p>
                                            <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-indigo-700 border border-indigo-200">
                                                Filtered by customer
                                            </span>
                                        </div>
                                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-700">
                                            {customerEmail && (
                                                <span className="inline-flex items-center gap-1">
                                                    <Mail className="h-3 w-3 text-gray-500" />
                                                    <span className="truncate">
                                                        {customerEmail}
                                                    </span>
                                                </span>
                                            )}
                                            {customerPhone && (
                                                <span className="inline-flex items-center gap-1">
                                                    <Phone className="h-3 w-3 text-gray-500" />
                                                    <span className="truncate">
                                                        {customerPhone}
                                                    </span>
                                                </span>
                                            )}
                                            {!customer && (
                                                <span className="text-[11px] text-gray-500">
                                                    Customer not found in your list, showing rides
                                                    by ID {customerId}.
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Link
                                        href={`/rides?`}
                                        className="w-full sm:w-auto"
                                    >
                                        <Button
                                            variant="outline"
                                            size="xs"
                                            className="w-full sm:w-auto"
                                        >
                                            Clear customer filter
                                        </Button>
                                    </Link>
                                    {customer && (
                                        <Link
                                            href={`/customers/${encodeURIComponent(
                                                customer.user?._id || "",
                                            )}`}
                                            className="w-full sm:w-auto"
                                        >
                                            <Button
                                                variant="ghost"
                                                size="xs"
                                                className="w-full sm:w-auto"
                                            >
                                                Open customer
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

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

                    {/* RIDES LIST */}
                    <div className="space-y-2 sm:space-y-4">
                        {rides.length === 0 && !isLoading && (
                            <div className="text-sm text-gray-500">
                                {isCustomerFiltered
                                    ? "No rides for this customer match current filters."
                                    : "No rides match current filters."}
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
