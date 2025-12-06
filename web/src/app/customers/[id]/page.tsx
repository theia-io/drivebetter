// app/customers/[id]/page.tsx
"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import {
    ArrowLeft,
    User as UserIcon,
    Mail,
    Phone,
    Calendar,
    Clock,
    Car,
    Info,
    MapPin,
} from "lucide-react";
import { useCustomerRides, useMyCustomers } from "@/stores/customers";

const dt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "—");

export default function CustomerDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { data: customers, isLoading, error } = useMyCustomers();

    const customer = useMemo(
        () =>
            customers?.find(
                (c) =>
                    c.user?._id === id ||
                    c.profile?._id === id ||
                    c.profile?.userId === id,
            ),
        [customers, id],
    );

    const stats = customer?.stats;

    const name = customer?.user?.name || "Unnamed customer";
    const email = customer?.user?.email || "";
    const phone = customer?.user?.phone || "";
    const age = customer?.profile?.age;
    const createdAt = customer?.profile?.createdAt || customer?.user?.createdAt;
    const updatedAt = customer?.profile?.updatedAt || customer?.user?.updatedAt;

    const isRegistered = !!customer?.user?._id;

    // Resolve user id for rides:
    const customerUserId =
        customer?.user?._id || customer?.profile?.userId || (isRegistered ? id : undefined);

    const {
        data: rides,
        isLoading: ridesLoading,
        error: ridesError,
        total: ridesTotalFromApi,
    } = useCustomerRides(customerUserId, {
        enabled: !!customerUserId,
        page: 1,
        limit: 5,
    });

    // Derived stats: total + last ride
    const totalRides =
        (stats && typeof stats.ridesTotal === "number" && stats.ridesTotal) ||
        ridesTotalFromApi ||
        rides.length ||
        0;

    const lastRideAtIso: string | null =
        (stats && stats.lastRideAt) ||
        (rides.length > 0 ? rides[0].datetime : null);

    return (
        <ProtectedLayout>
            <Container className="px-3 sm:px-6 lg:px-8">
                <div className="space-y-4 sm:space-y-6 pb-4 sm:pb-8">
                    {/* Toolbar – mobile-friendly layout */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        {/* Back + avatar + basic info */}
                        <div className="min-w-0 space-y-2">
                            <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<ArrowLeft className="w-4 h-4" />}
                                className="w-fit"
                                onClick={() => router.push("/customers")}
                            >
                                Back
                            </Button>

                            <div className="flex items-start gap-3 min-w-0">
                                <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-200 shrink-0">
                                    <UserIcon className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div className="min-w-0 space-y-1">
                                    <Typography className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                                        {name}
                                    </Typography>
                                    <div className="flex flex-col gap-1 text-xs sm:text-sm text-gray-500">
                                        {email && (
                                            <span className="flex items-center gap-1 min-w-0">
                                                <Mail className="w-3 h-3" />
                                                <span className="truncate">{email}</span>
                                            </span>
                                        )}
                                        {phone && (
                                            <span className="flex items-center gap-1 min-w-0">
                                                <Phone className="w-3 h-3" />
                                                <span className="truncate">{phone}</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions – full width on mobile, inline on desktop */}
                        {customer && (
                            <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:justify-end">
                                <Button
                                    size="sm"
                                    colorScheme="success"
                                    className="w-full sm:w-auto"
                                    onClick={() =>
                                        router.push(
                                            `/rides/new?customerId=${encodeURIComponent(
                                                customer.user?._id || id,
                                            )}`,
                                        )
                                    }
                                    leftIcon={<Car className="w-4 h-4" />}
                                >
                                    New ride
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    colorScheme="secondary"
                                    className="w-full sm:w-auto"
                                    onClick={() =>
                                        router.push(
                                            `/rides?customerId=${encodeURIComponent(
                                                customer.user?._id || id,
                                            )}`,
                                        )
                                    }
                                >
                                    Ride history
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Loading / error / empty states */}
                    {isLoading && (
                        <div className="text-sm text-gray-500">Loading customer…</div>
                    )}
                    {!isLoading && error && (
                        <div className="flex items-center gap-2 text-sm text-red-600">
                            <Info className="w-4 h-4" />
                            <span>Failed to load customer.</span>
                        </div>
                    )}
                    {!isLoading && !error && !customer && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Info className="w-4 h-4" />
                            <span>Customer not found.</span>
                        </div>
                    )}

                    {customer && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                            {/* Left: profile */}
                            <div className="lg:col-span-2 space-y-4 sm:space-y-5">
                                {!isRegistered && (
                                    <Card className="border-amber-200 bg-amber-50">
                                        <CardBody className="flex items-start gap-3">
                                            <Info className="w-4 h-4 mt-0.5 text-amber-600" />
                                            <div className="space-y-1">
                                                <Typography className="text-xs sm:text-sm font-medium text-amber-800">
                                                    Invitation pending
                                                </Typography>
                                                <Typography className="text-xs sm:text-sm text-amber-800">
                                                    This customer has not completed registration yet.
                                                </Typography>
                                            </div>
                                        </CardBody>
                                    </Card>
                                )}

                                <Card>
                                    <CardBody className="space-y-4 sm:space-y-5">
                                        <Typography className="text-sm sm:text-base font-semibold text-gray-900">
                                            Basic information
                                        </Typography>

                                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
                                            <div>
                                                <dt className="text-xs sm:text-sm text-gray-500">
                                                    Name
                                                </dt>
                                                <dd className="mt-0.5 text-sm sm:text-base font-medium text-gray-900 break-words">
                                                    {name}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-xs sm:text-sm text-gray-500">
                                                    Email
                                                </dt>
                                                <dd className="mt-0.5 text-sm sm:text-base font-medium text-gray-900 break-words">
                                                    {email || "—"}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-xs sm:text-sm text-gray-500">
                                                    Phone
                                                </dt>
                                                <dd className="mt-0.5 text-sm sm:text-base font-medium text-gray-900 break-words">
                                                    {phone || "—"}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-xs sm:text-sm text-gray-500">
                                                    Age
                                                </dt>
                                                <dd className="mt-0.5 text-sm sm:text-base font-medium text-gray-900">
                                                    {age != null ? age : "—"}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="flex items-center gap-1 text-xs sm:text-sm text-gray-500">
                                                    <Calendar className="w-3 h-3" />
                                                    Created
                                                </dt>
                                                <dd className="mt-0.5 text-sm sm:text-base font-medium text-gray-900">
                                                    {dt(createdAt)}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="flex items-center gap-1 text-xs sm:text-sm text-gray-500">
                                                    <Clock className="w-3 h-3" />
                                                    Last update
                                                </dt>
                                                <dd className="mt-0.5 text-sm sm:text-base font-medium text-gray-900">
                                                    {dt(updatedAt)}
                                                </dd>
                                            </div>
                                        </dl>
                                    </CardBody>
                                </Card>
                            </div>

                            {/* Right: stats and rides */}
                            <div className="space-y-4 sm:space-y-5">
                                {/* Recent rides */}
                                <Card>
                                    <CardBody className="space-y-3">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <Typography className="text-sm sm:text-base font-semibold text-gray-900">
                                                Recent rides
                                            </Typography>
                                            {customerUserId && (
                                                <Button
                                                    size="xs"
                                                    variant="outline"
                                                    colorScheme="secondary"
                                                    className="w-full sm:w-auto"
                                                    onClick={() =>
                                                        router.push(
                                                            `/rides?customerId=${encodeURIComponent(
                                                                customer.user?._id || id,
                                                            )}`,
                                                        )
                                                    }
                                                >
                                                    View all
                                                </Button>
                                            )}
                                        </div>

                                        {ridesLoading && (
                                            <div className="text-xs text-gray-500">
                                                Loading rides…
                                            </div>
                                        )}

                                        {!ridesLoading && ridesError && (
                                            <div className="flex items-center gap-2 text-xs text-red-600">
                                                <Info className="w-3 h-3" />
                                                <span>Failed to load rides.</span>
                                            </div>
                                        )}

                                        {!ridesLoading && !ridesError && rides.length === 0 && (
                                            <div className="text-xs text-gray-500">
                                                No rides for this customer yet.
                                            </div>
                                        )}

                                        {!ridesLoading && !ridesError && rides.length > 0 && (
                                            <ul className="divide-y divide-gray-100">
                                                {rides.map((ride: any) => (
                                                    <li
                                                        key={ride._id}
                                                        className="py-2.5 flex flex-col gap-1 text-xs sm:text-sm"
                                                    >
                                                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                <MapPin className="w-3 h-3 text-gray-400" />
                                                                <span className="truncate font-medium text-gray-900">
                                                                    {ride.from} → {ride.to}
                                                                </span>
                                                            </div>
                                                            <span className="inline-flex items-center self-start rounded-full border border-gray-200 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-600 sm:self-auto">
                                                                {ride.status}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-[11px] text-gray-500">
                                                            <span>{dt(ride.datetime)}</span>
                                                            <Link
                                                                href={`/rides/${ride._id}`}
                                                                className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700"
                                                            >
                                                                View ride
                                                            </Link>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </CardBody>
                                </Card>

                                {/* Ride statistics */}
                                <Card>
                                    <CardBody className="space-y-4">
                                        <Typography className="text-sm sm:text-base font-semibold text-gray-900">
                                            Ride statistics
                                        </Typography>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                                                <div className="text-xs text-gray-500">
                                                    Total rides
                                                </div>
                                                <div className="mt-1 text-lg font-semibold text-gray-900">
                                                    {totalRides}
                                                </div>
                                            </div>
                                            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                                                <div className="text-xs text-gray-500">
                                                    Last ride
                                                </div>
                                                <div className="mt-1 text-xs sm:text-sm font-medium text-gray-900">
                                                    {dt(lastRideAtIso)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                colorScheme="secondary"
                                                className="w-full"
                                                onClick={() =>
                                                    router.push(
                                                        `/rides?customerId=${encodeURIComponent(
                                                            customer.user?._id || id,
                                                        )}`,
                                                    )
                                                }
                                            >
                                                View ride history
                                            </Button>
                                            <Link
                                                href={`/rides/new?customerId=${encodeURIComponent(
                                                    customer.user?._id || id,
                                                )}`}
                                                className="w-full"
                                            >
                                                <Button
                                                    size="sm"
                                                    colorScheme="success"
                                                    className="w-full"
                                                    leftIcon={<Car className="w-4 h-4" />}
                                                >
                                                    Create ride
                                                </Button>
                                            </Link>
                                        </div>
                                    </CardBody>
                                </Card>
                            </div>
                        </div>
                    )}
                </div>
            </Container>
        </ProtectedLayout>
    );
}
