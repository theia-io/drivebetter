"use client";

import { Button, Card, CardBody, Typography } from "@/components/ui";
import RideStatusDropdown from "@/components/ui/ride/RideStatusDropdown";
import RideStatusStepper from "@/components/ui/ride/RideStatusStepper";
import { Play, Trash2 } from "lucide-react";

import { useAuthStore } from "@/stores";
import {
    useAssignRide,
    useDeleteRide,
    useRide,
    useSetRideStatus,
    useUnAssignRide,
} from "@/stores/rides";
import { RideCreatorUser } from "@/types";
import { getPossibleStatuses, getStatusLabel, type RideStatus } from "@/types/rideStatus";
import { useRouter } from "next/navigation";

export default function RideStatus({ id }: { id: string }) {
    const { data: ride, mutate } = useRide(id);
    const router = useRouter();

    const { user } = useAuthStore();
    const canManage =
        user?.roles?.some((r) => r === "admin") ||
        (ride?.creatorId as RideCreatorUser)?._id == user?._id;

    const isAssignedDriver =
        ride?.assignedDriverId && user?._id
            ? String(ride.assignedDriverId) === String(user._id)
            : false;

    const canChangeStatus = !!ride && (canManage || isAssignedDriver);

    const { setRideStatus, isSettingStatus } = useSetRideStatus(id);

    const { unassignRide } = useUnAssignRide(id);
    const { assignRide } = useAssignRide(id);

    const { deleteRide, isDeleting } = useDeleteRide(id);

    const statusValue: RideStatus = (ride?.status as RideStatus) || "unassigned";
    const statusLabel = getStatusLabel(statusValue);

    async function handleStatusChange(nextStatus: RideStatus) {
        if (nextStatus === "assigned" && user?._id === ride?.creatorId?._id) {
            await assignRide({ driverId: user?._id });
        } else if (nextStatus === "unassigned" && user?._id === ride?.creatorId?._id) {
            await unassignRide();
        } else {
            const res = await setRideStatus({ status: nextStatus });
            if (res?.ok) {
                await mutate();
            }
        }
    }

    async function onDelete() {
        const ok = confirm("Delete this ride?");
        if (!ok) return;
        const res = await deleteRide();
        if (res?.ok) router.push("/rides");
    }

    const isActiveModeAvailable =
        isAssignedDriver && ride.status !== "unassigned" && ride.status !== "completed";

    return (
        <>
            {/* Status / actions card */}
            {canChangeStatus && (
                <Card variant="elevated">
                    <CardBody className="p-4 md:p-5 space-y-4">
                        <div>
                            <Typography className="text-sm font-semibold text-gray-900">
                                Ride status
                            </Typography>
                            <p className="mt-1 text-xs md:text-sm text-gray-600 max-w-md">
                                Track and update the ride lifecycle: unassigned, assigned, on my
                                way, on location, passenger on board, clear, completed.
                            </p>
                        </div>

                        <div>
                            <RideStatusStepper value={statusValue} />
                            <div className="mt-1 text-[11px] text-gray-600">
                                Current: <span className="font-semibold">{statusLabel}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div className="w-full md:w-80" onClick={(e) => e.stopPropagation()}>
                                <RideStatusDropdown
                                    rideStatus={statusValue}
                                    possibleStatuses={getPossibleStatuses(statusValue, ride, user)}
                                    disabled={isSettingStatus}
                                    onChange={handleStatusChange}
                                    className="w-full"
                                />
                            </div>

                            {canManage && (
                                <Button
                                    variant="outline"
                                    colorScheme="error"
                                    size="sm"
                                    leftIcon={<Trash2 className="w-4 h-4" />}
                                    onClick={onDelete}
                                    disabled={isDeleting}
                                    className="w-full md:w-auto"
                                >
                                    Delete ride
                                </Button>
                            )}
                        </div>

                        {/* Floating Active Ride activator (driver only) */}
                        {isActiveModeAvailable && (
                            <div className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-40">
                                <div className="group relative flex flex-col items-end gap-1">
                                    <button
                                        type="button"
                                        onClick={() => router.push(`/rides/${id}/active`)}
                                        className="inline-flex h-16 w-16 items-center justify-center cursor-pointer rounded-full bg-indigo-600 text-white shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        aria-label="Open Active Ride mode"
                                    >
                                        <Play className="w-7 h-7" />
                                    </button>
                                    {/* Mobile-visible text under the FAB */}
                                    <div className="rounded-md bg-gray-900 px-2 py-1 text-[11px] text-white md:hidden">
                                        Active Ride mode
                                    </div>
                                    {/* Hover label on larger screens */}
                                    <div className="pointer-events-none absolute right-full w-[150px] mr-2 top-1/2 -translate-y-1/2 rounded-md bg-gray-900 px-2 py-1 text-[11px] text-white opacity-0 group-hover:opacity-100 hidden md:block">
                                        Open Active Ride mode
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardBody>
                </Card>
            )}
        </>
    );
}
