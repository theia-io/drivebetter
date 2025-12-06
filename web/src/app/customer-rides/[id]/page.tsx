// app/customer-rides/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import { ArrowLeft, MapPin, Clock, Car, DollarSign } from "lucide-react";

import { useAuthStore } from "@/stores";
import { getRoute } from "@/stores/routes";
import LeafletMap from "@/components/ui/maps/LeafletMap";
import ShortRideSummary from "@/components/ride/ShortRideSummary";
import {
    getPillStatusColor,
    getStatusLabel,
    type RideStatus as RideStatusType,
} from "@/types/rideStatus";
import {useCustomerRide} from "@/stores/customers";

export default function CustomerRideDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuthStore();

    const { data: ride } = useCustomerRide(id);

    const [routeLine, setRouteLine] = useState<[number, number][]>([]);

    const statusValue: RideStatusType = (ride?.status as RideStatusType) || "unassigned";
    const statusLabel = getStatusLabel(statusValue);
    const statusPillClasses = getPillStatusColor(statusValue);

    const hasA = !!ride?.fromLocation?.coordinates?.length;
    const hasB = !!ride?.toLocation?.coordinates?.length;

    const header = ride ? `${ride.from} → ${ride.to}` : "";

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!ride?.fromLocation || !ride?.toLocation) {
                setRouteLine([]);
                return;
            }
            const [lonA, latA] = ride.fromLocation.coordinates;
            const [lonB, latB] = ride.toLocation.coordinates;
            const r = await getRoute([lonA, latA], [lonB, latB]);
            if (cancelled) return;
            setRouteLine(r.geometry);
        })();

        return () => {
            cancelled = true;
        };
    }, [ride?.fromLocation, ride?.toLocation]);

    if (!ride) {
        return (
            <ProtectedLayout>
                <Container className="px-3 md:px-6 lg:px-8">
                    <div className="py-8 text-sm text-gray-600">Loading…</div>
                </Container>
            </ProtectedLayout>
        );
    }

    const amount =
        typeof ride.payment?.amountCents === "number"
            ? ride.payment.amountCents / 100
            : null;

    const createdAt = ride.createdAt ? new Date(ride.createdAt) : null;
    const datetime = ride.datetime ? new Date(ride.datetime) : null;

    return (
        <ProtectedLayout>
            <Container className="px-3 md:px-6 lg:px-8">
                <div className="space-y-4 md:space-y-6 pb-4 md:pb-8">
                    {/* Toolbar – customer, mobile friendly */}
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-col gap-2 min-w-0">
                            <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<ArrowLeft className="w-4 h-4" />}
                                className="w-fit"
                                onClick={() => router.push("/customer-rides")}
                            >
                                Back to my rides
                            </Button>
                            <div className="space-y-1">
                                <Typography
                                    variant="h1"
                                    className="text-base md:text-2xl font-bold text-gray-900 whitespace-normal break-words leading-tight"
                                >
                                    {header}
                                </Typography>
                                <div className="flex flex-col gap-1 text-xs md:text-sm text-gray-600">
                                    {datetime && (
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            <span>{datetime.toLocaleString()}</span>
                                        </span>
                                    )}
                                    {createdAt && (
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            <span>
                                                Created: {createdAt.toLocaleString()}
                                            </span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Status pill – display only */}
                        <div className="flex items-start md:items-center md:justify-end">
                            <div
                                className={[
                                    "inline-flex flex-col md:flex-row md:items-center rounded-full border px-2.5 py-1 text-[11px] font-medium",
                                    statusPillClasses,
                                ].join(" ")}
                            >
                                <span className="mr-0 md:mr-1 text-[10px] uppercase tracking-wide text-gray-600/80">
                                    Status
                                </span>
                                <span className="capitalize">{statusLabel}</span>
                            </div>
                        </div>
                    </div>

                    {/* Short summary (reused, assumed read-only) */}
                    <ShortRideSummary id={id} />

                    {/* Basic info card */}
                    <Card>
                        <CardBody className="space-y-4 md:space-y-5">
                            <Typography className="text-sm md:text-base font-semibold text-gray-900">
                                Ride details
                            </Typography>

                            <div className="space-y-3 text-sm">
                                <div className="flex items-start gap-2">
                                    <MapPin className="mt-0.5 h-4 w-4 text-gray-400" />
                                    <div>
                                        <div className="text-xs uppercase tracking-wide text-gray-500">
                                            From
                                        </div>
                                        <div className="text-sm font-medium text-gray-900 break-words">
                                            {ride.from}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <MapPin className="mt-0.5 h-4 w-4 text-gray-400" />
                                    <div>
                                        <div className="text-xs uppercase tracking-wide text-gray-500">
                                            To
                                        </div>
                                        <div className="text-sm font-medium text-gray-900 break-words">
                                            {ride.to}
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <div className="text-xs uppercase tracking-wide text-gray-500">
                                            Type
                                        </div>
                                        <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-xs text-gray-800">
                                            <Car className="h-3 w-3 text-gray-400" />
                                            <span>
                                                {ride.type === "reservation"
                                                    ? "Reservation"
                                                    : "ASAP"}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs uppercase tracking-wide text-gray-500">
                                            Price
                                        </div>
                                        <div className="mt-0.5 flex items-center gap-1 text-sm font-medium text-gray-900">
                                            <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                                            <span>
                                                {amount !== null
                                                    ? amount.toFixed(2)
                                                    : "—"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Map */}
                    {(hasA || hasB) && (
                        <Card>
                            <CardBody className="p-3 md:p-4">
                                <LeafletMap
                                    heightClass="h-64 md:h-80 z-10"
                                    markerA={
                                        hasA
                                            ? (ride!.fromLocation!.coordinates as [
                                                number,
                                                number,
                                            ])
                                            : undefined
                                    }
                                    markerALabel="A"
                                    markerB={
                                        hasB
                                            ? (ride!.toLocation!.coordinates as [
                                                number,
                                                number,
                                            ])
                                            : undefined
                                    }
                                    markerBLabel="B"
                                    routeLine={routeLine}
                                    center={
                                        hasA
                                            ? (ride!.fromLocation!.coordinates as [
                                                number,
                                                number,
                                            ])
                                            : hasB
                                                ? (ride!.toLocation!.coordinates as [
                                                    number,
                                                    number,
                                                ])
                                                : undefined
                                    }
                                />
                            </CardBody>
                        </Card>
                    )}

                    {/* Notes + payment info (read-only) */}
                    <Card>
                        <CardBody className="p-4 md:p-6 space-y-4">
                            <div>
                                <Typography className="text-sm font-medium text-gray-900 mb-1">
                                    Notes
                                </Typography>
                                <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-700 min-h-[44px] bg-white">
                                    {ride.notes?.trim() || "—"}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                <div className="rounded-lg border border-gray-200 p-3">
                                    <div className="text-xs text-gray-500">
                                        Payment method
                                    </div>
                                    <div className="mt-0.5 text-sm font-medium text-gray-900">
                                        {ride.payment?.method || "—"}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-gray-200 p-3">
                                    <div className="text-xs text-gray-500">
                                        Paid
                                    </div>
                                    <div className="mt-0.5 text-sm font-medium text-gray-900">
                                        {ride.payment?.paid ? "Yes" : "No"}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-gray-200 p-3">
                                    <div className="text-xs text-gray-500">
                                        Driver settled
                                    </div>
                                    <div className="mt-0.5 text-sm font-medium text-gray-900">
                                        {ride.payment?.driverPaid ? "Yes" : "No"}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-gray-200 p-3">
                                    <div className="text-xs text-gray-500">
                                        Visibility
                                    </div>
                                    <div className="mt-0.5 text-sm font-medium text-gray-900">
                                        {ride.coveredVisible ? "Visible" : "Hidden"}
                                    </div>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </Container>
        </ProtectedLayout>
    );
}
