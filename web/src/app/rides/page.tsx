"use client";

import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import {
    Calendar,
    Car,
    Filter,
    Navigation,
    Plus,
    Search,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRidesInfinite } from "@/stores/rides";
import {Ride} from "@/types";
import { useAuthStore } from "@/stores";
import DriverCombobox from "@/components/ui/ride/DriverCombobox";
import RideSummaryCard from "@/components/ui/ride/RideSummaryCard";


export default function RidesPage() {
    const { user } = useAuthStore();
    const currentUserId = user?._id || (user as any)?.id || "";
    const roles = user?.roles ?? [];
    const isPrivileged = roles.includes("admin") || roles.includes("dispatcher");

    // -------------------- Filters state --------------------
    const [driver, setDriver] = useState<any | null>(null); // DriverCombobox returns { _id, name, email } (or similar)
    const [dateFrom, setDateFrom] = useState<string>(""); // YYYY-MM-DD
    const [dateTo, setDateTo] = useState<string>(""); // YYYY-MM-DD
    const [distanceMin, setDistanceMin] = useState<string>(""); // km as string input
    const [distanceMax, setDistanceMax] = useState<string>(""); // km as string input

    // Build params for the hook
    const params = useMemo(() => {
        // backend expects meters; UI asks for km
        const minMeters =
            distanceMin.trim() !== "" ? Math.max(0, Math.round(Number(distanceMin) * 1000)) : undefined;
        const maxMeters =
            distanceMax.trim() !== "" ? Math.max(0, Math.round(Number(distanceMax) * 1000)) : undefined;

        // convert dates to ISO start/end if your API expects them; if it expects plain YYYY-MM-DD, pass as-is
        const fromISO = dateFrom ? new Date(`${dateFrom}T00:00:00.000Z`).toISOString() : undefined;
        const toISO = dateTo ? new Date(`${dateTo}T23:59:59.999Z`).toISOString() : undefined;

        return {
            driverId: driver?._id || undefined,
            dateFrom: fromISO,
            dateTo: toISO,
            distanceMin: minMeters,
            distanceMax: maxMeters,
        };
    }, [driver, dateFrom, dateTo, distanceMin, distanceMax]);

    // When filters change, start from the first page
    const { items, size, setSize, isLoading, reachedEnd, mutate } = useRidesInfinite(params, 20);
    const myRides = useMemo(
        () =>
            items.filter((r) => {
                const creatorId = (r as any).creatorId ? String((r as Ride).creatorId._id) : "";
                return creatorId === currentUserId;
            }),
        [items, currentUserId]
    );
    const rides = roles.includes("driver") ? myRides : items;

    useEffect(() => {
        setSize(1);
        mutate();
    }, [params.driverId, params.dateFrom, params.dateTo, params.distanceMin, params.distanceMax]);

    return (
        <ProtectedLayout>
            <Container className="px-3 sm:px-6 lg:px-8">
                <div className="space-y-4 sm:space-y-8">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <Typography variant="h1" className="text-xl sm:text-3xl font-bold text-gray-900 truncate">
                                Rides
                            </Typography>
                            <Typography variant="body1" className="text-gray-600 mt-0.5 sm:mt-2 text-xs sm:text-base">
                                Manage ride history and upcoming trips
                            </Typography>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 sm:gap-3 shrink-0">
                            <Button leftIcon={<Plus className="w-4 h-4" />} size="sm">
                                <Link href="/rides/new">New Ride</Link>
                            </Button>
                        </div>
                    </div>

                    {/* Rides List */}
                    <div className="space-y-2 sm:space-y-4">
                        {rides.map((ride: Ride) => (
                            <RideSummaryCard
                                key={ride._id}
                                ride={ride}
                                onDriverAssigned={() => {
                                    mutate();
                                }}
                            />
                        ))}
                    </div>

                    {/* Load More */}
                    <div className="sticky bottom-3 sm:static sm:bottom-auto">
                        <div className="text-center">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full sm:w-auto"
                                onClick={() => setSize(size + 1)}
                                disabled={isLoading || reachedEnd}
                            >
                                {reachedEnd ? "No More Rides" : isLoading ? "Loading..." : "Load More Rides"}
                            </Button>
                        </div>
                    </div>
                </div>
            </Container>
        </ProtectedLayout>
    );
}
