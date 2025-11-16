"use client";

import {useCallback, useMemo, useState} from "react";
import { Calendar as RBCalendar, dateFnsLocalizer, View, Event as RBCEvent } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addMinutes, addDays } from "date-fns";
import {enGB} from "date-fns/locale/en-GB";
import "react-big-calendar/lib/css/react-big-calendar.css";

import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import {CalendarDays, CalendarIcon, ChevronLeft, ChevronRight, Clock, Loader2, MapPin, User, X} from "lucide-react";
import { useAuthStore } from "@/stores";
import { useRidesInfinite } from "@/stores/rides";
import {Ride} from "@/types";
import Link from "next/link";
import { fmtDate, fmtTime, money, km, mins } from "@/services/convertors";
import RideSummaryCard from "@/components/ui/ride/RideSummaryCard";
import {mutate} from "swr";
import {getPillStatusColor, getStatusColors, getStatusDotColor} from "@/types/rideStatus";

// ---------- react-big-calendar localizer ----------

const locales = {
    "en-GB": enGB,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
    getDay,
    locales,
});

// ---------- Helpers ----------

type CalendarEvent = {
    id: string;
    title: string;
    start: Date;
    end: Date;
    ride: Ride;
};

type RideEvent = RBCEvent & {
    resource: Ride;
};

function formatRangeLabel(date: Date, view: View): string {
    if (view === "month") {
        // e.g. "November 2025"
        return format(date, "MMMM yyyy");
    }

    if (view === "week") {
        // week starts Monday (to match your localizer)
        const start = startOfWeek(date, { weekStartsOn: 1 });
        const end = addDays(start, 6);

        // If same month: "10–16 Nov 2025"
        if (start.getMonth() === end.getMonth()) {
            return `${format(start, "d")}–${format(end, "d MMM yyyy")}`;
        }
        // If spanning months: "30 Sep – 6 Oct 2025"
        return `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;
    }

    // "day" (and any other) → "14 Nov 2025"
    return format(date, "d MMM yyyy");
}

export default function DriverCalendarPage() {
    const { user } = useAuthStore();
    const currentUserId = user?._id || (user as any)?.id || "";

    const [view, setView] = useState<View>("week");
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [selectedRide, setSelectedRide] = useState<Ride | null>(null);

    // Fetch LOTS of rides and filter client-side by creator/assigned
    const { items: allRides, isLoading, mutate } = useRidesInfinite({}, 100);

    const eventPropGetter = (event: RideEvent) => {
        const ride = event.ride;
        const { bg, border, text } = getStatusColors(ride?.status);
        return {
            style: {
                backgroundColor: bg,
                borderColor: border,
                color: text,
                borderRadius: "4px",
                borderWidth: "1px",
                fontSize: "0.75rem",
                padding: "2px 4px",
            },
        };
    };

    const events: CalendarEvent[] = useMemo(
        () =>
            allRides.map((ride) => {
                const start = new Date(ride.datetime);
                const end = addMinutes(start, 60);
                return {
                    id: String(ride._id),
                    title: `${ride.from} → ${ride.to}`,
                    start,
                    end,
                    ride,
                };
            }),
        [allRides]
    );

    const handleDriverAssigned = useCallback(
        async (rideId: string, driverUserId: string) => {
            // update the ride shown in the preview
            setSelectedRide((prev) => {
                if (!prev || prev._id !== rideId) return prev;
                return {
                    ...prev,
                    assignedDriverId: driverUserId,
                    // status usually becomes "assigned" from "unassigned"
                    status: prev.status === "unassigned" ? "assigned" : prev.status,
                };
            });

            // refresh the underlying list used by the calendar
            await mutate();
        },
        [mutate]
    );

    const onNavigate = (date: Date) => {
        setCurrentDate(date);
    };

    const onViewChange = (nextView: View) => {
        setView(nextView);
    };

    return (
        <ProtectedLayout>
            <Container className="px-3 sm:px-6 lg:px-8">
                <div className="space-y-4 sm:space-y-6 pb-4 sm:pb-8">
                    {/* Header + controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                        <div className="flex items-start gap-2">
                            <div className="mt-0.5 sm:mt-1">
                                <CalendarDays className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div className="min-w-0">
                                <Typography
                                    variant="h1"
                                    className="text-lg sm:text-2xl font-bold text-gray-900 truncate"
                                >
                                    My Calendar
                                </Typography>
                                <Typography className="text-xs sm:text-sm text-gray-600">
                                    Rides you created or are assigned to, in a calendar view.
                                </Typography>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <div className="flex items-center gap-2">
                                <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-2 py-1 text-xs sm:text-sm">
                                    <CalendarIcon className="w-4 h-4 text-gray-500" />
                                    <span>{formatRangeLabel(currentDate, view)}</span>
                                </div>
                                {isLoading && (
                                    <div className="inline-flex items-center gap-1 text-xs text-gray-500">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Loading rides…
                                    </div>
                                )}
                            </div>
                            {/* Date navigation */}
                            <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white">
                                <button
                                    type="button"
                                    onClick={() =>
                                        onNavigate(
                                            view === "month"
                                                ? new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
                                                : view === "week"
                                                    ? new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7)
                                                    : new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1)
                                        )
                                    }
                                    className="px-2 py-1.5 text-gray-600 hover:bg-gray-50"
                                    aria-label="Previous"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onNavigate(new Date())}
                                    className="px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Today
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        onNavigate(
                                            view === "month"
                                                ? new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
                                                : view === "week"
                                                    ? new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7)
                                                    : new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1)
                                        )
                                    }
                                    className="px-2 py-1.5 text-gray-600 hover:bg-gray-50"
                                    aria-label="Next"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>

                            {/* View switcher */}
                            <div className="inline-flex rounded-lg border border-gray-200 bg-white text-xs sm:text-sm">
                                <button
                                    type="button"
                                    onClick={() => onViewChange("day")}
                                    className={`px-2 sm:px-3 py-1.5 rounded-l-lg ${
                                        view === "day"
                                            ? "bg-indigo-50 text-indigo-700 border-r border-indigo-100"
                                            : "text-gray-600 hover:bg-gray-50 border-r border-gray-200"
                                    }`}
                                >
                                    Day
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onViewChange("week")}
                                    className={`px-2 sm:px-3 py-1.5 ${
                                        view === "week"
                                            ? "bg-indigo-50 text-indigo-700 border-x border-indigo-100"
                                            : "text-gray-600 hover:bg-gray-50 border-x border-gray-200"
                                    }`}
                                >
                                    Week
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onViewChange("month")}
                                    className={`px-2 sm:px-3 py-1.5 rounded-r-lg ${
                                        view === "month"
                                            ? "bg-indigo-50 text-indigo-700"
                                            : "text-gray-600 hover:bg-gray-50"
                                    }`}
                                >
                                    Month
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Calendar + legend */}
                    <Card variant="elevated">
                        <CardBody className="p-2 sm:p-4">
                            <div className="h-[60vh] sm:h-[70vh]">
                                <RBCalendar
                                    localizer={localizer}
                                    events={events}
                                    startAccessor="start"
                                    endAccessor="end"
                                    view={view}
                                    date={currentDate}
                                    onView={onViewChange}
                                    onNavigate={onNavigate}
                                    toolbar={false}
                                    popup
                                    selectable={false}
                                    onSelectEvent={(event) => setSelectedRide(event.ride)}
                                    eventPropGetter={eventPropGetter}
                                    components={{
                                        event: ({ event }) => {
                                            const r = (event as CalendarEvent).ride;
                                            return (
                                                <div className="flex flex-col text-[10px] sm:text-xs leading-tight">
                                                    <span className="font-semibold truncate">{r.from} → {r.to}</span>
                                                    <span className="truncate">
                            {fmtTime(r.datetime)} • {r.payment?.amountCents ? money(r.payment.amountCents) : ""}
                          </span>
                                                </div>
                                            );
                                        },
                                    }}
                                />
                            </div>

                            {/* Legend */}
                            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-600">
                                <div className="inline-flex items-center gap-1">
                                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Unassigned
                                </div>
                                <div className="inline-flex items-center gap-1">
                                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Assigned
                                </div>
                                <div className="inline-flex items-center gap-1">
                                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Completed
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </Container>

            {/* Mobile-friendly ride preview modal */}
            {selectedRide && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
                    onClick={() => setSelectedRide(null)}
                >
                    <div
                        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-lg p-4 sm:p-6
                       max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="min-w-0">
                                <Typography className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                                    {selectedRide.from} → {selectedRide.to}
                                </Typography>
                                <div className="text-xs sm:text-sm text-gray-500">
                                    {fmtDate(selectedRide.datetime)} • {fmtTime(selectedRide.datetime)}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedRide(null)}
                                className="ml-2 text-gray-400 hover:text-gray-600"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Status pill */}
                        <div
                            className={`mb-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getPillStatusColor(
                                selectedRide.status
                            )}`}
                        >
                            <span className={`mr-1 h-2 w-2 rounded-full ${getStatusDotColor(selectedRide.status)}`} />
                            <span className="capitalize">{selectedRide.status.replace(/_/g, " ")}</span>
                        </div>

                        {/* Main info */}
                        <RideSummaryCard
                            ride={selectedRide}
                            onDriverAssigned={(driverUserId) =>
                                handleDriverAssigned(selectedRide._id, driverUserId)
                            }
                        />

                        {/* Actions */}
                        <div className="mt-4 flex flex-col sm:flex-row gap-2">
                            <Link href={`/rides/${selectedRide._id}`} className="w-full sm:w-auto">
                                <Button size="sm" className="w-full">
                                    Open ride
                                </Button>
                            </Link>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full sm:w-auto"
                                onClick={() => setSelectedRide(null)}
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </ProtectedLayout>
    );
}
