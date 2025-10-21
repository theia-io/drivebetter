"use client";

import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import { Calendar, Car, Clock, DollarSign, Filter, MapPin, Navigation, Plus, Search, Star, User } from "lucide-react";
import Link from "next/link";
import {useEffect, useMemo} from "react";
import { useRidesInfinite } from "@/stores/rides";
import {Ride} from "@/types";
import AssignedDriverBadge from "@/components/ui/AssignedDriverBadge";
import {fmtDate, fmtTime, km, mins, money} from "@/services/convertors";
import {useRouter} from "next/navigation";
import {useAuthStore} from "@/stores";

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
    const router = useRouter();
    const { user } = useAuthStore();
    const isChecking = typeof user === "undefined";
    const roles = user?.roles ?? [];
    const isDriver = roles.includes("driver");
    const isPrivileged = roles.includes("admin") || roles.includes("dispatcher");
    const isDriverOnly = isDriver && !isPrivileged;

    useEffect(() => {
        if (!isChecking && isDriverOnly) {
            router.replace("/my-rides");
        }
    }, [isChecking, isDriverOnly, router]);

    const { items, size, setSize, isLoading, reachedEnd } = useRidesInfinite({}, 20);

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
                                Manage your ride history and upcoming trips
                            </Typography>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 sm:gap-3 shrink-0">
                            <Button leftIcon={<Plus className="w-4 h-4" />} size="sm">
                                <Link href="/rides/new">New Ride</Link>
                            </Button>
                        </div>
                    </div>

                    {/* Mobile quick actions */}
                    <div className="flex sm:hidden gap-2">
                        <Button variant="outline" size="sm" className="flex-1" leftIcon={<Filter className="w-4 h-4" />}>Filter</Button>
                        <Button size="sm" className="flex-1" leftIcon={<Plus className="w-4 h-4" />}>
                            <Link href="/rides/new" className="w-full text-center">New Ride</Link>
                        </Button>
                    </div>

                    {/* Stats: responsive grid, tighter on mobile */}
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

                    {/* Search */}
                    <Card variant="elevated">
                        <CardBody className="p-3 sm:p-6">
                            <div className="flex gap-2 sm:gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                                    <input
                                        type="text"
                                        placeholder="Search rides by location..."
                                        className="w-full pl-9 sm:pl-10 pr-3 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
                                        disabled
                                    />
                                </div>
                                <Button variant="outline" leftIcon={<Filter className="w-4 h-4" />} size="sm">Filter</Button>
                                <Button
                                    variant="outline"
                                    leftIcon={<Calendar className="w-4 h-4" />}
                                    size="sm"
                                    className="hidden sm:inline-flex"
                                    disabled
                                >
                                    Date Range
                                </Button>
                            </div>
                            {/* Mobile date button below input for better tap target */}
                            <Button
                                variant="outline"
                                leftIcon={<Calendar className="w-4 h-4" />}
                                size="sm"
                                className="mt-2 w-full sm:hidden"
                                disabled
                            >
                                Date Range
                            </Button>
                        </CardBody>
                    </Card>

                    {/* Rides List: compact mobile row, richer on larger screens */}
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
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-medium border ${getStatusColor(
                                                ride.status
                                            )}`}>
                  {getStatusIcon(ride.status)}
                                            <span className="ml-1 capitalize">{ride.status.replace(/_/g, " ")}
                                            </span>
                                        </span>
                                    </div>

                                    {/* Secondary meta: stack on mobile */}
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

                                    {/* Actions: full-width on mobile */}
                                    <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2">
                                        <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs">
                                            <Link href={`/rides/${ride._id}`}>Details</Link>
                                        </Button>
                                        {ride.status === "unassigned" && (
                                            <Button size="sm" className="w-full sm:w-auto text-xs">Start</Button>
                                        )}
                                    </div>
                                </CardBody>
                            </Card>
                        ))}
                    </div>

                    {/* Load More: sticky on mobile for easy reach */}
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
