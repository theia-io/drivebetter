"use client";

import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import {
    Calendar,
    Car,
    Clock,
    DollarSign,
    Filter,
    MapPin,
    Navigation,
    Plus,
    Search,
    Star,
    User,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRidesInfinite } from "@/stores/rides";
import { Ride } from "@/types";
import AssignedDriverBadge from "@/components/ui/AssignedDriverBadge";
import { fmtDate, fmtTime, km, mins, money } from "@/services/convertors";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import DriverCombobox from "@/components/ui/DriverCombobox";

function getStatusColor(status: string) {
    switch (status) {
        case "completed":
            return "bg-green-100 text-green-800 border-green-200";
        case "assigned":
        case "on_my_way":
        case "on_location":
        case "pob":
        case "clear":
            return "bg-blue-100 text-blue-800 border-blue-200";
        case "unassigned":
            return "bg-yellow-100 text-yellow-800 border-yellow-200";
        default:
            return "bg-gray-100 text-gray-800 border-gray-200";
    }
}
function getStatusIcon(status: string) {
    switch (status) {
        case "completed":
            return <Star className="w-4 h-4" />;
        case "assigned":
        case "on_my_way":
        case "on_location":
        case "pob":
        case "clear":
            return <Navigation className="w-4 h-4" />;
        case "unassigned":
            return <Clock className="w-4 h-4" />;
        default:
            return <Car className="w-4 h-4" />;
    }
}

export default function RidesPage() {
    const { user } = useAuthStore();
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

    // Optional: requery immediately when filters change (SWR key change usually handles it,
    // but if your hook caches aggressively, forcing a mutate is fine)
    useEffect(() => {
        // reset pagination to page 1
        setSize(1);
        // trigger revalidation
        mutate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.driverId, params.dateFrom, params.dateTo, params.distanceMin, params.distanceMax]);

    const todaysCount = useMemo(() => {
        const todayStr = new Date().toDateString();
        return items.filter((r) => new Date(r.datetime).toDateString() === todayStr).length;
    }, [items]);

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

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-6">
                        <Card variant="elevated" className="hover:shadow-lg transition-shadow">
                            <CardBody className="p-3 sm:p-6">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <Typography variant="body2" className="text-gray-600 font-medium text-[11px] sm:text-sm">
                                            Today&apos;s Rides
                                        </Typography>
                                        <Typography variant="h2" className="text-base sm:text-2xl font-bold text-gray-900 mt-0.5 sm:mt-1">
                                            {todaysCount}
                                        </Typography>
                                    </div>
                                    <div className="p-2 sm:p-3 bg-blue-50 rounded-xl border border-blue-200">
                                        <Car className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    </div>

                    {/* Filters */}
                    <Card variant="elevated">
                        <CardBody className="p-3 sm:p-6 space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                                <Filter className="w-4 h-4" />
                                Filters
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {/* Driver filter (only visible to admins/dispatchers) */}
                                <div className={`${isPrivileged ? "" : "hidden"}`}>
                                    <label className="block text-xs text-gray-600 mb-1">Driver</label>
                                    <DriverCombobox
                                        id="driver-filter"
                                        valueEmail={driver?.email || ""}
                                        onChange={(v: any | null) => setDriver(v)}
                                    />
                                </div>

                                {/* Date From */}
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Date from</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="date"
                                            value={dateFrom}
                                            onChange={(e) => setDateFrom(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Date To */}
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Date to</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="date"
                                            value={dateTo}
                                            onChange={(e) => setDateTo(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Distance range (km) */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Min distance (km)</label>
                                    <div className="relative">
                                        <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="number"
                                            min={0}
                                            step="0.1"
                                            value={distanceMin}
                                            onChange={(e) => setDistanceMin(e.target.value)}
                                            placeholder="e.g. 3"
                                            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Max distance (km)</label>
                                    <div className="relative">
                                        <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="number"
                                            min={0}
                                            step="0.1"
                                            value={distanceMax}
                                            onChange={(e) => setDistanceMax(e.target.value)}
                                            placeholder="e.g. 50"
                                            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Quick actions */}
                                <div className="flex items-end gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        leftIcon={<Search className="w-4 h-4" />}
                                        onClick={() => {
                                            // simply revalidate with current params; SWR key already changes as user types, but this gives an explicit action
                                            setSize(1);
                                            mutate();
                                        }}
                                    >
                                        Apply
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setDriver(null);
                                            setDateFrom("");
                                            setDateTo("");
                                            setDistanceMin("");
                                            setDistanceMax("");
                                        }}
                                    >
                                        Reset
                                    </Button>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Rides List */}
                    <div className="space-y-2 sm:space-y-4">
                        {items.map((ride: Ride) => (
                            <Card key={ride._id} variant="elevated" className="hover:shadow-lg transition-shadow">
                                <CardBody className="p-3 sm:p-6">
                                    {/* Row header: title + status */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex items-start gap-2 sm:gap-3">
                                            <div className="w-9 h-9 sm:w-12 sm:h-12 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                                                <User className="w-4 h-4 sm:w-6 sm:h-6 text-indigo-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <Typography className="text-sm sm:text-lg font-semibold text-gray-900 truncate">
                                                    {ride.from} → {ride.to}
                                                </Typography>
                                                <div className="mt-0.5 sm:mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-sm text-gray-600">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                              {fmtDate(ride.datetime)} • {fmtTime(ride.datetime)}
                          </span>
                                                    <span className="inline-flex items-center gap-1">
                            <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                                                        {money(ride.payment?.amountCents)}
                          </span>
                                                </div>
                                            </div>
                                        </div>
                                        <span
                                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-medium border ${getStatusColor(
                                                ride.status
                                            )}`}
                                        >
                      {getStatusIcon(ride.status)}
                                            <span className="ml-1 capitalize">{ride.status.replace(/_/g, " ")}</span>
                    </span>
                                    </div>

                                    {/* Secondary meta */}
                                    <div className="mt-2 sm:mt-3 grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 text-[11px] sm:text-sm text-gray-600">
                                        <div className="flex items-center">
                                            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 text-gray-400 shrink-0" />
                                            <span className="truncate">{ride.from}</span>
                                        </div>
                                        <div className="flex items-center">
                                            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 text-gray-400 shrink-0" />
                                            <span className="truncate">{ride.to}</span>
                                        </div>
                                        <div className="flex items-center">
                                            <Navigation className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 text-gray-400 shrink-0" />
                                            <span className="truncate">{km(ride.distance)}</span>
                                        </div>
                                        <div className="flex items-center">
                                            <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 text-gray-400 shrink-0" />
                                            <span className="truncate">{mins((ride as any).durationMinutes)}</span>
                                        </div>
                                        <AssignedDriverBadge userId={ride.assignedDriverId as string | undefined} />
                                    </div>

                                    {/* Actions */}
                                    <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2">
                                        <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs">
                                            <Link href={`/rides/${ride._id}`}>Details</Link>
                                        </Button>
                                        {ride.status === "unassigned" && (
                                            <Button size="sm" className="w-full sm:w-auto text-xs">
                                                Start
                                            </Button>
                                        )}
                                    </div>
                                </CardBody>
                            </Card>
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
