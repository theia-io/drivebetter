"use client";

import React from "react";
import Link from "next/link";
import { Card, CardBody, Button, Typography } from "@/components/ui";
import {
    Calendar as CalendarIcon,
    Car,
    Clock,
    DollarSign,
    MapPin,
    Navigation,
    Star,
    User,
} from "lucide-react";

import type { Ride, RideCreatorUser } from "@/types";
import { fmtDate, fmtTime, km, mins, money } from "@/services/convertors";
import AssignedDriverBadge from "@/components/ui/AssignedDriverBadge";
import RideCreatorBadge from "@/components/ui/RideCreatorBadge";

type RideSummaryCardProps = {
    ride: Ride;
    /** Optional: override details URL. Defaults to `/rides/:id` */
    detailsHref?: string;
    /** Optional: show Details / Start actions (used in main list, calendar can hide them) */
    showActions?: boolean;
    /** Optional: extra actions on the right of the Details button */
    extraActions?: React.ReactNode;
    /** Optional: compact mode (slightly tighter paddings) */
    compact?: boolean;
};

/* ---------- Status helpers (moved out of page) ---------- */

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
            return <Star className="w-3.5 h-3.5" />;
        case "assigned":
        case "on_my_way":
        case "on_location":
        case "pob":
        case "clear":
            return <Navigation className="w-3.5 h-3.5" />;
        case "unassigned":
            return <Clock className="w-3.5 h-3.5" />;
        default:
            return <Car className="w-3.5 h-3.5" />;
    }
}

/* ----------------------- Component ----------------------- */

export default function RideSummaryCard({
                                            ride,
                                            detailsHref,
                                            showActions = true,
                                            extraActions,
                                            compact = false,
                                        }: RideSummaryCardProps) {
    const createdAt = new Date(ride.createdAt);
    const rideTime = new Date(ride.datetime);

    const paddingClass = compact ? "p-3 sm:p-4" : "p-3 sm:p-6";

    return (
        <Card
            key={ride._id}
            variant="elevated"
            className="hover:shadow-lg transition-shadow"
        >
            <CardBody className={paddingClass}>
                {/* Header: title + status */}
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex items-start gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                        </div>
                        <div className="min-w-0 space-y-1">
                            <Typography className="text-sm sm:text-lg font-semibold text-gray-900 truncate">
                                {ride.from} → {ride.to}
                            </Typography>

                            {/* Creator */}
                            {ride.creatorId && (
                                <RideCreatorBadge
                                    creator={ride.creatorId as RideCreatorUser}
                                />
                            )}

                            {/* Primary meta */}
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs text-gray-600">
                <span className="inline-flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400" />
                  <span className="font-medium">Ride time:</span>
                  <span>
                    {fmtDate(ride.datetime)} • {fmtTime(ride.datetime)}
                  </span>
                </span>
                                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400" />
                  <span className="font-medium">Created:</span>
                  <span>
                    {createdAt.toLocaleDateString()} •{" "}
                      {createdAt.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                      })}
                  </span>
                </span>
                                {typeof ride.payment?.amountCents === "number" && (
                                    <span className="inline-flex items-center gap-1">
                    <DollarSign className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400" />
                    <span className="font-medium">
                      {money(ride.payment.amountCents)}
                    </span>
                  </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Status pill */}
                    <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-medium border ${getStatusColor(
                            ride.status,
                        )}`}
                    >
            {getStatusIcon(ride.status)}
                        <span className="ml-1 capitalize">
              {ride.status.replace(/_/g, " ")}
            </span>
          </span>
                </div>

                {/* Secondary meta (compact, mobile-first) */}
                <div className="mt-2 sm:mt-3 grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-3 text-[11px] sm:text-xs text-gray-600">
                    <div className="flex items-center">
                        <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1.5 text-gray-400 shrink-0" />
                        <span className="truncate">{ride.from}</span>
                    </div>
                    <div className="flex items-center">
                        <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1.5 text-gray-400 shrink-0" />
                        <span className="truncate">{ride.to}</span>
                    </div>
                    {ride.distance != null && (
                        <div className="flex items-center">
                            <Navigation className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1.5 text-gray-400 shrink-0" />
                            <span className="truncate">{km(ride.distance)}</span>
                        </div>
                    )}
                    {(ride as any).durationMinutes != null && (
                        <div className="flex items-center">
                            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1.5 text-gray-400 shrink-0" />
                            <span className="truncate">
                {mins((ride as any).durationMinutes)}
              </span>
                        </div>
                    )}

                    {/* Assigned driver badge in its own row on mobile, inline on larger screens */}
                    <div className="sm:col-span-4">
                        <AssignedDriverBadge
                            userId={ride.assignedDriverId as string | undefined}
                        />
                    </div>
                </div>

                {/* Actions */}
                {showActions && (
                    <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto text-xs"
                        >
                            <Link href={detailsHref || `/rides/${ride._id}`}>Details</Link>
                        </Button>
                        {ride.status === "unassigned" && (
                            <Button size="sm" className="w-full sm:w-auto text-xs">
                                Start
                            </Button>
                        )}
                        {extraActions}
                    </div>
                )}
            </CardBody>
        </Card>
    );
}
