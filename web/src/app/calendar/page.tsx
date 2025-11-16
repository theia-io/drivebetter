"use client";

import { useCallback, useMemo, useState } from "react";
import {
    Calendar as RBCalendar,
    dateFnsLocalizer,
    View,
    Event as RBCEvent,
} from "react-big-calendar";
import {
    format,
    parse,
    startOfWeek,
    getDay,
    addMinutes,
    addDays,
    startOfDay,
} from "date-fns";
import { enGB } from "date-fns/locale/en-GB";
import "react-big-calendar/lib/css/react-big-calendar.css";

import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import {
    CalendarDays,
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Loader2,
    X,
} from "lucide-react";
import Link from "next/link";

import { useRidesInfinite } from "@/stores/rides";
import { Ride } from "@/types";
import { fmtDate, fmtTime, km, mins, money } from "@/services/convertors";
import RideSummaryCard from "@/components/ui/ride/RideSummaryCard";
import {
    type RideStatus,
    getStatusColors,
    getStatusDotColor,
    getPillStatusColor,
    getStatusIcon,
} from "@/types/rideStatus";

const locales = { "en-GB": enGB };

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
    getDay,
    locales,
});

// ---- Types ----

type DayBuckets = {
    total: number;
    unassigned: number;
    inProgress: number;
    completed: number;
};

type CalendarEventResource =
    | { kind: "ride"; ride: Ride }
    | { kind: "analytics"; buckets: DayBuckets };

type CalendarEvent = RBCEvent & {
    resource: CalendarEventResource;
};

// ---- Helpers ----

function formatRangeLabel(date: Date, view: View): string {
    if (view === "month") return format(date, "MMMM yyyy");

    if (view === "week") {
        const start = startOfWeek(date, { weekStartsOn: 1 });
        const end = addDays(start, 6);
        if (start.getMonth() === end.getMonth()) {
            return `${format(start, "d")}–${format(end, "d MMM yyyy")}`;
        }
        return `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;
    }

    return format(date, "d MMM yyyy");
}

// top-left corner label
const TimeGutterHeader = () => (
    <div className="px-1 text-[9px] sm:text-[10px] leading-tight text-gray-500">
        Daily stats
    </div>
);

// unified renderer
const CalendarEventRenderer = ({ event }: { event: RBCEvent }) => {
    const e = event as CalendarEvent;
    const res = e.resource;

    if (!res) return null;

    if (res.kind === "analytics") {
        const { total, unassigned, inProgress, completed } = res.buckets;
        if (!total) return null;

        const dateKey = format(e.start as Date, "yyyy-MM-dd");

        const scrollToFirst = (bucket: "unassigned" | "inProgress" | "completed") => {
            const selector = `.ride-event.ride-day-${dateKey}.ride-bucket-${bucket}`;
            const el = document.querySelector(selector) as HTMLElement | null;
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        };

        return (
            <div className="flex h-full flex-col items-center justify-center py-0.5">
        <span className="text-[9px] sm:text-[10px] font-medium text-gray-600">
          {total} ride{total > 1 ? "s" : ""}
        </span>
                <div className="mt-0.5 flex items-center gap-1.5">
                    {unassigned > 0 && (
                        <button
                            type="button"
                            onClick={(ev) => {
                                ev.stopPropagation();
                                scrollToFirst("unassigned");
                            }}
                            className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] sm:text-[10px] text-amber-800 cursor-pointer"
                        >
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            {unassigned} unassigned
                        </button>
                    )}
                    {inProgress > 0 && (
                        <button
                            type="button"
                            onClick={(ev) => {
                                ev.stopPropagation();
                                scrollToFirst("inProgress");
                            }}
                            className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] sm:text-[10px] text-blue-800 cursor-pointer"
                        >
                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                            {inProgress} in&nbsp;progress
                        </button>
                    )}
                    {completed > 0 && (
                        <button
                            type="button"
                            onClick={(ev) => {
                                ev.stopPropagation();
                                scrollToFirst("completed");
                            }}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] sm:text-[10px] text-emerald-800 cursor-pointer"
                        >
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            {completed} completed
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (res.kind === "ride") {
        const r = res.ride;
        const Icon = getStatusIcon(r.status as RideStatus);
        const hasAmount = !!r.payment?.amountCents;

        return (
            <div className="flex items-start gap-1.5 text-[10px] sm:text-xs leading-snug">
                <div className="mt-0.5 shrink-0">
                    <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">
                        {fmtTime(r.datetime)} · {r.from} → {r.to}
                    </div>
                    <div className="truncate">
                        {hasAmount ? money(r.payment!.amountCents) : km(r.distance || 0)}{" "}
                        {mins((r as any).durationMinutes)
                            ? `• ${mins((r as any).durationMinutes)}`
                            : ""}
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default function CalendarPage() {
    const [view, setView] = useState<View>("week");
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [selectedRide, setSelectedRide] = useState<Ride | null>(null);

    // showMore modal state
    const [showMoreState, setShowMoreState] = useState<{
        date: Date;
        events: CalendarEvent[];
    } | null>(null);

    const { items: allRides, isLoading, mutate } = useRidesInfinite({}, 200);

    const rideBucketsByDay = useMemo(() => {
        const map = new Map<string, DayBuckets>();

        for (const ride of allRides) {
            const key = format(new Date(ride.datetime), "yyyy-MM-dd");
            const curr =
                map.get(key) || {
                    total: 0,
                    unassigned: 0,
                    inProgress: 0,
                    completed: 0,
                };

            curr.total += 1;

            if (ride.status === "completed") {
                curr.completed += 1;
            } else if (ride.status === "unassigned") {
                curr.unassigned += 1;
            } else {
                curr.inProgress += 1;
            }

            map.set(key, curr);
        }

        return map;
    }, [allRides]);

    const events: CalendarEvent[] = useMemo(() => {
        const rideEvents: CalendarEvent[] = allRides.map((ride) => {
            const start = new Date(ride.datetime);
            const end = addMinutes(start, 60);

            return {
                id: String(ride._id),
                title: `${ride.from} → ${ride.to}`,
                start,
                end,
                allDay: false,
                resource: { kind: "ride", ride },
            };
        });

        const analyticsEvents: CalendarEvent[] = Array.from(
            rideBucketsByDay.entries(),
        ).map(([key, buckets]) => {
            const dayStart = startOfDay(new Date(`${key}T00:00:00`));
            return {
                id: `analytics-${key}`,
                title: "",
                start: dayStart,
                end: dayStart,
                allDay: true,
                resource: { kind: "analytics", buckets },
            };
        });

        return [...rideEvents, ...analyticsEvents];
    }, [allRides, rideBucketsByDay]);

    const eventPropGetter = (event: RBCEvent) => {
        const e = event as CalendarEvent;
        const res = e.resource;
        const dateKey = format(e.start as Date, "yyyy-MM-dd");

        if (res?.kind === "analytics") {
            return {
                style: {
                    backgroundColor: "transparent",
                    border: "none",
                    boxShadow: "none",
                    padding: 0,
                },
                className: "",
            };
        }

        if (res?.kind === "ride") {
            const ride = res.ride;
            const { bg, border, text } = getStatusColors(ride.status as RideStatus);

            let bucket: "unassigned" | "inProgress" | "completed";
            if (ride.status === "completed") bucket = "completed";
            else if (ride.status === "unassigned") bucket = "unassigned";
            else bucket = "inProgress";

            return {
                style: {
                    backgroundColor: bg,
                    borderColor: border,
                    color: text,
                    borderRadius: "6px",
                    borderWidth: "1px",
                    fontSize: "0.75rem",
                    padding: "2px 4px",
                },
                className: `ride-event ride-day-${dateKey} ride-bucket-${bucket}`,
            };
        }

        return {};
    };

    const handleDriverAssigned = useCallback(
        async (rideId: string, driverUserId: string) => {
            setSelectedRide((prev) => {
                if (!prev || prev._id !== rideId) return prev;
                return {
                    ...prev,
                    assignedDriverId: driverUserId,
                    status:
                        prev.status === "unassigned"
                            ? ("assigned" as RideStatus)
                            : prev.status,
                };
            });

            await mutate();
        },
        [mutate],
    );

    const onNavigate = (date: Date) => setCurrentDate(date);
    const onViewChange = (nextView: View) => setView(nextView);

    const goToPrevious = () => {
        if (view === "month") {
            onNavigate(
                new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
            );
        } else if (view === "week") {
            onNavigate(addDays(currentDate, -7));
        } else {
            onNavigate(addDays(currentDate, -1));
        }
    };

    const goToNext = () => {
        if (view === "month") {
            onNavigate(
                new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
            );
        } else if (view === "week") {
            onNavigate(addDays(currentDate, 7));
        } else {
            onNavigate(addDays(currentDate, 1));
        }
    };

    const rangeLabel = formatRangeLabel(currentDate, view);

    return (
        <ProtectedLayout>
            <Container className="px-3 sm:px-6 lg:px-8">
                <div className="space-y-4 sm:space-y-6 pb-4 sm:pb-8">
                    {/* Header + controls */}
                    <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-2">
                            <div className="mt-0.5 sm:mt-1">
                                <CalendarDays className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div className="min-w-0">
                                <Typography className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                                    Calendar
                                </Typography>
                                <Typography className="text-xs sm:text-sm text-gray-600">
                                    Rides schedule with daily stats and quick preview.
                                </Typography>
                            </div>
                        </div>

                        <div className="w-full sm:w-auto flex flex-col gap-2">
                            {/* navigation + range + today */}
                            <div className="flex flex-wrap justify-center sm:justify-end gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={goToPrevious}
                                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                                >
                                    Previous
                                </Button>

                                <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs sm:text-sm">
                                    <CalendarDays className="w-4 h-4 text-gray-500" />
                                    <span className="font-medium text-gray-800">
                    {rangeLabel}
                  </span>
                                    {isLoading && (
                                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading…
                    </span>
                                    )}
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={goToNext}
                                    rightIcon={<ChevronRight className="w-4 h-4" />}
                                >
                                    Next
                                </Button>

                                <Button
                                    variant="solid"
                                    size="sm"
                                    leftIcon={<CalendarIcon className="w-4 h-4" />}
                                    onClick={() => onNavigate(new Date())}
                                >
                                    Today
                                </Button>
                            </div>

                            {/* view switcher */}
                            <div className="flex justify-center sm:justify-end">
                                <div className="inline-flex w-full max-w-xs sm:max-w-none sm:w-auto rounded-lg border border-gray-200 bg-white text-xs sm:text-sm">
                                    <button
                                        type="button"
                                        onClick={() => onViewChange("day")}
                                        className={`flex-1 px-3 py-1.5 rounded-l-lg ${
                                            view === "day"
                                                ? "bg-indigo-50 text-indigo-700 border-r border-indigo-100"
                                                : "border-r border-gray-200 text-gray-600 hover:bg-gray-50"
                                        }`}
                                    >
                                        Day
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onViewChange("week")}
                                        className={`flex-1 px-3 py-1.5 ${
                                            view === "week"
                                                ? "bg-indigo-50 text-indigo-700 border-x border-indigo-100"
                                                : "border-x border-gray-200 text-gray-600 hover:bg-gray-50"
                                        }`}
                                    >
                                        Week
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onViewChange("month")}
                                        className={`flex-1 px-3 py-1.5 rounded-r-lg ${
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
                                    popup={false}
                                    selectable={false}
                                    onSelectEvent={(event) => {
                                        const e = event as CalendarEvent;
                                        if (e.resource.kind === "ride") {
                                            setSelectedRide(e.resource.ride);
                                        }
                                    }}
                                    onShowMore={(events, date) => {
                                        const ridesOnly = (events as CalendarEvent[]).filter(
                                            (e) => e.resource.kind === "ride",
                                        );
                                        if (!ridesOnly.length) return;
                                        setShowMoreState({ date, events: ridesOnly });
                                    }}
                                    eventPropGetter={eventPropGetter}
                                    components={{
                                        event: CalendarEventRenderer,
                                        timeGutterHeader: TimeGutterHeader,
                                    }}
                                />
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-600">
                                <div className="inline-flex items-center gap-1">
                                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />{" "}
                                    Unassigned
                                </div>
                                <div className="inline-flex items-center gap-1">
                                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> In
                                    progress
                                </div>
                                <div className="inline-flex items-center gap-1">
                                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />{" "}
                                    Completed
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </Container>

            {/* Custom showMore modal for month view */}
            {showMoreState && (
                <div
                    className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40"
                    onClick={() => setShowMoreState(null)}
                >
                    <div
                        className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-4 sm:p-6 shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="min-w-0">
                                <Typography className="text-sm sm:text-base font-semibold text-gray-900">
                                    Rides on {fmtDate(showMoreState.date.toISOString())}
                                </Typography>
                                <Typography className="text-xs sm:text-sm text-gray-500">
                                    Tap a ride to open details.
                                </Typography>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowMoreState(null)}
                                className="ml-2 text-gray-400 hover:text-gray-600"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-2">
                            {showMoreState.events.map((ev) => {
                                const r =
                                    ev.resource.kind === "ride"
                                        ? ev.resource.ride
                                        : null;
                                if (!r) return null;

                                return (
                                    <button
                                        key={String(r._id)}
                                        type="button"
                                        onClick={() => {
                                            setSelectedRide(r);
                                            setShowMoreState(null);
                                        }}
                                        className="w-full text-left rounded-lg border border-gray-200 bg-white px-3 py-2 hover:bg-gray-50"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="text-xs font-semibold text-gray-900 truncate">
                                                    {fmtTime(r.datetime)} · {r.from} → {r.to}
                                                </div>
                                                <div className="mt-0.5 text-[11px] text-gray-600 truncate">
                                                    {r.distance ? km(r.distance) : ""}{" "}
                                                    {mins((r as any).durationMinutes)
                                                        ? `• ${mins((r as any).durationMinutes)}`
                                                        : ""}
                                                </div>
                                            </div>
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getPillStatusColor(
                                                    r.status,
                                                )}`}
                                            >
                        <span
                            className={`mr-1 h-1.5 w-1.5 rounded-full ${getStatusDotColor(
                                r.status,
                            )}`}
                        />
                        <span className="capitalize">
                          {r.status.replace(/_/g, " ")}
                        </span>
                      </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Ride preview modal */}
            {selectedRide && (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
                    onClick={() => setSelectedRide(null)}
                >
                    <div
                        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-4 sm:p-6 shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="min-w-0">
                                <Typography className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                                    {selectedRide.from} → {selectedRide.to}
                                </Typography>
                                <div className="text-xs sm:text-sm text-gray-500">
                                    {fmtDate(selectedRide.datetime)} •{" "}
                                    {fmtTime(selectedRide.datetime)}
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

                        <div
                            className={`mb-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getPillStatusColor(
                                selectedRide.status,
                            )}`}
                        >
              <span
                  className={`mr-1 h-2 w-2 rounded-full ${getStatusDotColor(
                      selectedRide.status,
                  )}`}
              />
                            <span className="capitalize">
                {selectedRide.status.replace(/_/g, " ")}
              </span>
                        </div>

                        <div className="mt-2 sm:mt-3 overflow-x-auto">
                            <RideSummaryCard
                                ride={selectedRide}
                                onDriverAssigned={(driverUserId) =>
                                    handleDriverAssigned(selectedRide._id, driverUserId)
                                }
                            />
                        </div>

                        <div className="mt-4 flex flex-col sm:flex-row gap-2">
                            <Link
                                href={`/rides/${selectedRide._id}`}
                                className="w-full sm:w-auto"
                            >
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
