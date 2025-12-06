// components/ride/cards/CustomerRideCard.tsx
"use client";

import Link from "next/link";
import { Card, CardBody, Button } from "@/components/ui";
import { MapPin, Clock, Car, DollarSign } from "lucide-react";
import type { Ride } from "@/types";

type Props = {
    ride: Ride;
};

const formatDateTime = (iso: string | Date | undefined) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
};

const statusColorClasses: Record<string, string> = {
    unassigned: "bg-gray-100 text-gray-700 border-gray-200",
    assigned: "bg-blue-50 text-blue-700 border-blue-200",
    on_my_way: "bg-sky-50 text-sky-700 border-sky-200",
    on_location: "bg-amber-50 text-amber-800 border-amber-200",
    pob: "bg-indigo-50 text-indigo-700 border-indigo-200",
    clear: "bg-emerald-50 text-emerald-700 border-emerald-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function CustomerRideCard({ ride }: Props) {
    const status = ride.status || "unassigned";
    const statusClasses =
        statusColorClasses[status] || statusColorClasses.unassigned;

    const amount =
        typeof ride.payment?.amountCents === "number"
            ? ride.payment.amountCents / 100
            : null;

    const driverName =
        (ride as any).assignedDriverName ||
        (ride as any).assignedDriver?.name ||
        null;

    return (
        <Card className="border border-gray-200 shadow-sm">
            <CardBody className="space-y-3">
                {/* Top row: route + status */}
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-2 min-w-0">
                        <MapPin className="mt-0.5 h-4 w-4 text-gray-400 shrink-0" />
                        <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">
                                {ride.from} → {ride.to}
                            </div>
                            <div className="mt-0.5 flex flex-col gap-0.5 text-[11px] text-gray-600">
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-gray-400" />
                                    <span>{formatDateTime(ride.datetime)}</span>
                                </span>
                                {driverName && (
                                    <span className="flex items-center gap-1">
                                        <Car className="h-3 w-3 text-gray-400" />
                                        <span>Driver: {driverName}</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <span
                        className={`inline-flex items-center self-start rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:self-auto ${statusClasses}`}
                    >
                        {status}
                    </span>
                </div>

                {/* Middle row: type + price */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5">
                        <Car className="h-3 w-3 text-gray-400" />
                        <span>{ride.type === "reservation" ? "Reservation" : "ASAP"}</span>
                    </span>
                    {amount !== null && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5">
                            <DollarSign className="h-3 w-3 text-gray-400" />
                            <span>{amount.toFixed(2)}</span>
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Link href={`/customer-rides/${ride._id}`} className="w-full sm:w-auto">
                        <Button
                            size="sm"
                            variant="outline"
                            colorScheme="secondary"
                            className="w-full"
                        >
                            View details
                        </Button>
                    </Link>
                </div>
            </CardBody>
        </Card>
    );
}
