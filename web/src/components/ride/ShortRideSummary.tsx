"use client";

import { Card, CardBody } from "@/components/ui";
import AssignDriverSelect from "@/components/ride/selectors/AssignDriverSelect";
import { fmtDate, fmtTime, km, mins, money } from "@/services/convertors";
import { useAuthStore } from "@/stores";
import { useRide } from "@/stores/rides";
import { useUser } from "@/stores/users";
import { RideCreatorUser } from "@/types";
import {
    Calendar,
    Clock,
    DollarSign,
    Link,
    MapPin,
    Navigation,
    PhoneIcon,
    User,
} from "lucide-react";

export default function ShortRideSummary({ id }: { id: string }) {
    const { user } = useAuthStore();

    const { data: ride, mutate } = useRide(id);

    const { data: driver } = useUser(ride?.assignedDriverId);

    const canManage =
        user?.roles?.some((r) => r === "admin") ||
        (ride?.creatorId as RideCreatorUser)?._id == user?._id;

    return (
        <Card variant="elevated">
            <CardBody className="p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-3">
                        <div className="flex items-center text-sm text-gray-700">
                            <User className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="font-medium mr-1">Customer Name:</span>
                            {ride?.customer?.name}
                        </div>
                        <div className="flex items-center text-sm text-gray-700">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="font-medium mr-1">When:</span>
                            {fmtDate(ride?.datetime)} • {fmtTime(ride?.datetime)}
                        </div>
                        <div className="flex items-center text-sm text-gray-700">
                            <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="font-medium mr-1">From:</span>
                            <span className="truncate">{ride?.from}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-700">
                            <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="font-medium mr-1">To:</span>
                            <span className="truncate">{ride?.to}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-700">
                            <Navigation className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="font-medium mr-1">Type:</span>
                            {ride?.type}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center text-sm text-gray-700">
                            <PhoneIcon className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="font-medium mr-1">Customer Phone:</span>
                            {ride?.customer?.phone}
                        </div>
                        <div className="flex items-center text-sm text-gray-700">
                            <DollarSign className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="font-medium mr-1">Fare:</span>
                            {money(ride?.payment?.amountCents)}
                        </div>
                        <div className="flex items-center text-sm text-gray-700">
                            <Clock className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="font-medium mr-1">ETA:</span>
                            {mins((ride as any)?.durationMinutes)}
                        </div>
                        <div className="flex items-center text-sm text-gray-700">
                            <Navigation className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="font-medium mr-1">Distance:</span>
                            {km(ride?.distance)}
                        </div>
                        <div className="space-y-1 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-400" />
                                <span className="font-medium">Assigned driver</span>

                                {ride?.assignedDriverId && (
                                    <Link
                                        href={`/users/${ride?.assignedDriverId}`}
                                        className="ml-1 inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/20 hover:bg-indigo-100 transition-colors truncate"
                                    >
                                        <span className="truncate">
                                            {driver?.name || "View driver"}
                                        </span>
                                        {driver?.email && (
                                            <span className="ml-1 text-gray-600/80">
                                                • {driver.email}
                                            </span>
                                        )}
                                    </Link>
                                )}
                            </div>

                            {ride?.status === "unassigned" && canManage && (
                                <div className="pl-6 w-full md:max-w-xs">
                                    <AssignDriverSelect
                                        rideId={ride._id}
                                        currentDriverId={ride.assignedDriverId || undefined}
                                        label={
                                            ride.assignedDriverId
                                                ? "Change driver"
                                                : "Choose a driver"
                                        }
                                        onAssigned={() => {
                                            mutate();
                                        }}
                                    />
                                </div>
                            )}

                            {!ride?.assignedDriverId &&
                                (!canManage || ride.status !== "unassigned") && (
                                    <div className="pl-6 text-xs text-gray-500">
                                        No driver assigned
                                    </div>
                                )}
                        </div>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}
