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
    Layers, ArrowLeft,
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

// ---------- Types ----------

type DayBuckets = {
    total: number;
    unassigned: number;
    assigned: number;
    on_my_way: number;
    on_location: number;
    pob: number;
    clear: number;
    completed: number;
};

type ClusterResource = {
    kind: "cluster";
    rides: Ride[];
    dateKey: string;
    timeLabel: string; // "HH:mm"
    start: Date;
};

type CalendarEventResource =
    | { kind: "ride"; ride: Ride }
    | { kind: "analytics"; buckets: DayBuckets; dateKey: string }
    | ClusterResource;

type CalendarEvent = RBCEvent & {
    resource: CalendarEventResource;
};

type ListModalState = {
    date: Date;
    title: string;
    rides: Ride[];
};

// ---------- Helpers ----------

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

const TimeGutterHeader = () => (
    <div className="px-1 text-[9px] sm:text-[10px] leading-tight text-gray-500">
        Daily stats
    </div>
);

// Map status → bucket used by clustering
function bucketForStatus(status: RideStatus): "unassigned" | "inProgress" | "completed" {
    if (status === "completed") return "completed";
    if (status === "unassigned") return "unassigned";
    return "inProgress";
}

// ---------- Event renderer ----------

const CalendarEventRenderer = ({ event }: { event: RBCEvent }) => {
    const e = event as CalendarEvent;
    const res = e.resource;

    if (!res) return null;

    // All-day analytics row (daily stats)
    if (res.kind === "analytics") {
        const { buckets, dateKey } = res;
        if (!buckets.total) return null;

        const scrollToStatus = (status: RideStatus) => {
            if (typeof document === "undefined") return;

            // 1) try a single ride with exact status
            const selectorExact = `.ride-event.ride-day-${dateKey}.ride-status-${status}`;
            let el = document.querySelector(selectorExact) as HTMLElement | null;

            // 2) if not found (clustered), fallback to bucket (unassigned / inProgress / completed)
            if (!el) {
                const bucket = bucketForStatus(status);
                const selectorBucket = `.ride-event.ride-day-${dateKey}.ride-bucket-${bucket}`;
                el = document.querySelector(selectorBucket) as HTMLElement | null;
            }

            if (!el) return;

            el.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "nearest",
            });
        };

        const renderChip = (status: RideStatus, count: number) => {
            if (!count) return null;
            return (
                <button
                    key={status}
                    type="button"
                    onClick={() => scrollToStatus(status)}
                    className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] sm:text-[10px] border ${getPillStatusColor(
                        status,
                    )} hover:bg-white/70 hover:shadow-sm focus:outline-none focus:ring-1 focus:ring-gray-300`}
                >
                    <span
                        className={`h-2 w-2 rounded-full ${getStatusDotColor(status)}`}
                    />
                    <span className="font-medium">
                        {count}{" "}
                        <span className="normal-case">
                            {status.replace(/_/g, " ")}
                        </span>
                    </span>
                </button>
            );
        };

        return (
            <div className="flex h-full flex-col items-center justify-center py-0.5">
                <span className="text-[9px] sm:text-[10px] font-medium text-gray-600">
                    {buckets.total} ride{buckets.total > 1 ? "s" : ""}
                </span>
                <div className="mt-0.5 flex flex-wrap items-center justify-center gap-1.5">
                    {renderChip("unassigned", buckets.unassigned)}
                    {renderChip("assigned", buckets.assigned)}
                    {renderChip("on_my_way", buckets.on_my_way)}
                    {renderChip("on_location", buckets.on_location)}
                    {renderChip("pob", buckets.pob)}
                    {renderChip("clear", buckets.clear)}
                    {renderChip("completed", buckets.completed)}
                </div>
            </div>
        );
    }

    // Cluster event
    if (res.kind === "cluster") {
        const rides = res.rides;
        const total = rides.length;
        let unassigned = 0;
        let inProgress = 0;
        let completed = 0;

        for (const r of rides) {
            if (r.status === "completed") completed += 1;
            else if (r.status === "unassigned") unassigned += 1;
            else inProgress += 1;
        }

        return (
            <div className="flex items-start gap-1.5 text-[10px] sm:text-xs leading-snug">
                <div className="mt-0.5 shrink-0">
                    <Layers className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-gray-500" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                        <span className="truncate font-semibold">
                            {res.timeLabel} • {total} rides
                        </span>
                        <span className="shrink-0 rounded-full border border-gray-300 bg-white px-1.5 py-[1px] text-[8px] font-semibold uppercase tracking-wide text-gray-600">
                            {total >= 4 ? "Show rides" : "Multiple rides"}
                        </span>
                    </div>
                    <div className="truncate text-[9px] sm:text-[10px] text-gray-700">
                        {unassigned > 0 && `${unassigned} unassigned`}
                        {inProgress > 0 &&
                            `${unassigned > 0 ? " • " : ""}${inProgress} in progress`}
                        {completed > 0 &&
                            `${unassigned > 0 || inProgress > 0 ? " • " : ""}${completed} completed`}
                    </div>
                    <div className="mt-0.5 text-[8px] sm:text-[9px] text-gray-400">
                        Tap to see rides list
                    </div>
                </div>
            </div>
        );
    }

    // Single ride event
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

// ---------- Main component ----------

export default function CalendarPage() {
    const [view, setView] = useState<View>("week");
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [selectedRide, setSelectedRide] = useState<Ride | null>(null);

    // multi-ride modal state
    const [listModal, setListModal] = useState<ListModalState | null>(null);
    const [listModalSelectedId, setListModalSelectedId] = useState<string | null>(
        null,
    );

    const { items: allRides, isLoading, mutate } = useRidesInfinite({}, 200);

    // local optimistic overrides by ride id
    const [rideOverrides, setRideOverrides] = useState<Record<string, Ride>>({});

    // merge SWR data with local overrides
    const mergedRides: Ride[] = useMemo(() => {
        if (!Object.keys(rideOverrides).length) return allRides;
        return allRides.map((r) => {
            const id = String(r._id);
            const override = rideOverrides[id];
            return override ? { ...r, ...override } : r;
        });
    }, [allRides, rideOverrides]);

    // Per-day buckets for analytics row, derived from mergedRides
    const rideBucketsByDay = useMemo(() => {
        const map = new Map<string, DayBuckets>();

        for (const ride of mergedRides) {
            const key = format(new Date(ride.datetime), "yyyy-MM-dd");
            const curr =
                map.get(key) || {
                    total: 0,
                    unassigned: 0,
                    assigned: 0,
                    on_my_way: 0,
                    on_location: 0,
                    pob: 0,
                    clear: 0,
                    completed: 0,
                };

            curr.total += 1;

            switch (ride.status as RideStatus) {
                case "unassigned":
                    curr.unassigned += 1;
                    break;
                case "assigned":
                    curr.assigned += 1;
                    break;
                case "on_my_way":
                    curr.on_my_way += 1;
                    break;
                case "on_location":
                    curr.on_location += 1;
                    break;
                case "pob":
                    curr.pob += 1;
                    break;
                case "clear":
                    curr.clear += 1;
                    break;
                case "completed":
                    curr.completed += 1;
                    break;
                default:
                    break;
            }

            map.set(key, curr);
        }

        return map;
    }, [mergedRides]);

    // Events with clustering, from mergedRides
    const events: CalendarEvent[] = useMemo(() => {
        type ClusterKey = string;

        const clusters = new Map<ClusterKey, ClusterResource>();
        const result: CalendarEvent[] = [];

        // All rides -> clusters
        for (const ride of mergedRides) {
            const start = new Date(ride.datetime);
            const dateKey = format(start, "yyyy-MM-dd");
            const timeLabel = format(start, "HH:mm");
            const key: ClusterKey = `${dateKey}|${timeLabel}`;

            if (!clusters.has(key)) {
                clusters.set(key, {
                    kind: "cluster",
                    rides: [],
                    dateKey,
                    timeLabel,
                    start,
                });
            }
            clusters.get(key)!.rides.push(ride);
        }

        // All-day analytics
        rideBucketsByDay.forEach((buckets, dateKey) => {
            const dayStart = startOfDay(new Date(`${dateKey}T00:00:00`));
            result.push({
                id: `analytics-${dateKey}`,
                title: "",
                start: dayStart,
                end: dayStart,
                allDay: true,
                resource: { kind: "analytics", buckets, dateKey },
            });
        });

        // Cluster / single-ride events
        clusters.forEach((cluster) => {
            const { rides, start, dateKey, timeLabel } = cluster;
            if (rides.length === 1) {
                const ride = rides[0];
                const rideStart = new Date(ride.datetime);
                const rideEnd = addMinutes(rideStart, 60);
                result.push({
                    id: String(ride._id),
                    title: `${ride.from} → ${ride.to}`,
                    start: rideStart,
                    end: rideEnd,
                    allDay: false,
                    resource: { kind: "ride", ride },
                });
            } else {
                const end = addMinutes(start, 60);
                result.push({
                    id: `cluster-${dateKey}-${timeLabel}`,
                    title: `${timeLabel} • ${rides.length} rides`,
                    start,
                    end,
                    allDay: false,
                    resource: cluster,
                });
            }
        });

        return result;
    }, [mergedRides, rideBucketsByDay]);

    const eventPropGetter = (event: RBCEvent) => {
        const e = event as CalendarEvent;
        const res = e.resource;
        const dateKey = format(e.start as Date, "yyyy-MM-dd");

        if (!res) return {};

        if (res.kind === "analytics") {
            return {
                style: {
                    backgroundColor: "transparent",
                    border: "none",
                    boxShadow: "none",
                    padding: 0,
                    overflow: "visible",
                },
                className: "",
            };
        }

        if (res.kind === "cluster") {
            const rides = res.rides;
            let unassigned = 0;
            let inProgress = 0;
            let completed = 0;

            for (const r of rides) {
                if (r.status === "completed") completed += 1;
                else if (r.status === "unassigned") unassigned += 1;
                else inProgress += 1;
            }

            const bucketClasses: string[] = [];
            if (unassigned > 0) bucketClasses.push("ride-bucket-unassigned");
            if (inProgress > 0) bucketClasses.push("ride-bucket-inProgress");
            if (completed > 0) bucketClasses.push("ride-bucket-completed");

            return {
                style: {
                    backgroundColor: "#f9fafb",
                    borderColor: "#d1d5db",
                    color: "#111827",
                    borderRadius: "6px",
                    borderWidth: "1px",
                    fontSize: "0.75rem",
                    padding: "2px 4px",
                },
                className: `ride-event ride-day-${dateKey} ${bucketClasses.join(" ")}`,
            };
        }

        if (res.kind === "ride") {
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
                className: `ride-event ride-day-${dateKey} ride-bucket-${bucket} ride-status-${ride.status}`,
            };
        }

        return {};
    };

    // driver assignment
    const handleDriverAssigned = useCallback(
        async (rideId: string, driverUserId: string) => {
            // update selected ride modal
            setSelectedRide((prev) => {
                if (!prev || String(prev._id) !== rideId) return prev;
                const newStatus: RideStatus =
                    prev.status === "unassigned" ? "assigned" : prev.status;
                return {
                    ...prev,
                    assignedDriverId: driverUserId,
                    status: newStatus,
                };
            });

            // update multi-ride modal
            setListModal((prev) => {
                if (!prev) return prev;
                const updatedRides = prev.rides.map((r) => {
                    if (String(r._id) !== rideId) return r;
                    const newStatus: RideStatus =
                        r.status === "unassigned" ? "assigned" : r.status;
                    return {
                        ...r,
                        assignedDriverId: driverUserId,
                        status: newStatus,
                    };
                });
                return { ...prev, rides: updatedRides };
            });

            // update overrides so stats + events react immediately
            setRideOverrides((prev) => {
                const current =
                    prev[rideId] ||
                    mergedRides.find((r) => String(r._id) === rideId) ||
                    ({} as Ride);
                const newStatus: RideStatus =
                    current.status === "unassigned" ? "assigned" : current.status;
                return {
                    ...prev,
                    [rideId]: {
                        ...current,
                        assignedDriverId: driverUserId,
                        status: newStatus,
                    },
                };
            });

            mutate(); // background revalidate
        },
        [mutate, mergedRides],
    );

    // status change from inside RideSummaryCard
    const handleRideStatusChanged = useCallback(
        (updatedRide: Ride) => {
            const id = String(updatedRide._id);
            const status = updatedRide.status as RideStatus;

            // 1) overrides used to derive mergedRides => events + daily stats
            setRideOverrides((prev) => ({
                ...prev,
                [id]: {
                    _id: updatedRide._id,
                    status,
                } as Ride,
            }));

            // 2) single selected ride preview modal
            setSelectedRide((prev) =>
                prev && String(prev._id) === id ? { ...prev, status } : prev,
            );

            // 3) multi-ride modal (list + details)
            setListModal((prev) => {
                if (!prev) return prev;
                const updatedRides = prev.rides.map((r) =>
                    String(r._id) === id ? { ...r, status } : r,
                );
                return { ...prev, rides: updatedRides };
            });

            mutate();
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

    const focusedListRide: Ride | null =
        listModal && listModalSelectedId
            ? (() => {
                const base =
                    listModal.rides.find(
                        (r) => String(r._id) === listModalSelectedId,
                    ) || null;
                if (!base) return null;
                const override = rideOverrides[String(base._id)];
                return override ? { ...base, ...override } : base;
            })()
            : null;

    const isListMode = !!listModal && !listModalSelectedId;

    return (
        <ProtectedLayout>
            <style jsx global>{`
                .rbc-allday-cell {
                    min-height: 40px;
                }
                .rbc-allday-cell .rbc-event {
                    overflow: visible;
                }
            `}</style>

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
                                    selectable={false}
                                    popup={false}
                                    dayLayoutAlgorithm="no-overlap"
                                    onSelectEvent={(event) => {
                                        const e = event as CalendarEvent;
                                        const res = e.resource;
                                        if (res.kind === "ride") {
                                            const base = res.ride;
                                            const override =
                                                rideOverrides[String(base._id)];
                                            const ride = override
                                                ? { ...base, ...override }
                                                : base;
                                            setSelectedRide(ride);
                                        } else if (res.kind === "cluster") {
                                            const rides = res.rides;
                                            if (!rides.length) return;
                                            // open in LIST mode
                                            setListModalSelectedId(null);
                                            setListModal({
                                                date: res.start,
                                                title: `Rides at ${res.timeLabel} on ${fmtDate(
                                                    res.start.toISOString(),
                                                )}`,
                                                rides,
                                            });
                                        }
                                    }}
                                    onShowMore={(evts, date) => {
                                        const rides: Ride[] = [];
                                        (evts as CalendarEvent[]).forEach((e) => {
                                            if (e.resource.kind === "ride") {
                                                rides.push(e.resource.ride);
                                            } else if (e.resource.kind === "cluster") {
                                                rides.push(...e.resource.rides);
                                            }
                                        });
                                        if (!rides.length) return;
                                        // open in LIST mode
                                        setListModalSelectedId(null);
                                        setListModal({
                                            date,
                                            title: `Rides on ${fmtDate(date.toISOString())}`,
                                            rides,
                                        });
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

            {/* Multi-ride modal: two modes (list / details) */}
            {listModal && (
                <div
                    className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40"
                    onClick={async () => {
                        setListModal(null);
                        setListModalSelectedId(null);
                        await mutate();
                    }}
                >
                    <div
                        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between gap-2 border-b px-4 py-3 sm:px-6 sm:py-4">
                            <div className="flex items-center gap-2 min-w-0">
                                {/* Back arrow only in details mode */}
                                {!isListMode && focusedListRide && (
                                    <button
                                        type="button"
                                        onClick={() => setListModalSelectedId(null)}
                                        className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white p-1.5 text-gray-600 hover:bg-gray-50 hover:text-gray-800 shrink-0"
                                        aria-label="Back to list"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                    </button>
                                )}

                                {isListMode ? (
                                    <div className="min-w-0">
                                        <Typography className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                                            {listModal.title}
                                        </Typography>
                                        <Typography className="text-xs sm:text-sm text-gray-500">
                                            Choose a ride to see details.
                                        </Typography>
                                    </div>
                                ) : (
                                    focusedListRide && (
                                        <div className="min-w-0">
                                            <Typography className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                                                {focusedListRide.from} → {focusedListRide.to}
                                            </Typography>

                                            <div className="mt-0.5 flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm text-gray-500 truncate">
                {fmtDate(focusedListRide.datetime)} • {fmtTime(focusedListRide.datetime)}
            </span>

                                                <span
                                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium border ${getPillStatusColor(
                                                        focusedListRide.status,
                                                    )}`}
                                                >
                <span
                    className={`mr-1 h-2 w-2 rounded-full ${getStatusDotColor(
                        focusedListRide.status,
                    )}`}
                />
                <span className="capitalize">
                    {focusedListRide.status.replace(/_/g, " ")}
                </span>
            </span>
                                            </div>
                                        </div>
                                    )

                                )}
                            </div>

                            <button
                                type="button"
                                onClick={async () => {
                                    setListModal(null);
                                    setListModalSelectedId(null);
                                    await mutate();
                                }}
                                className="ml-2 text-gray-400 hover:text-gray-600 shrink-0"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="max-h-[60vh] overflow-y-auto px-4 py-3 sm:px-6 sm:py-4">
                            {isListMode ? (
                                <div className="space-y-2">
                                    {listModal.rides.map((r) => {
                                        const id = String(r._id);
                                        const override = rideOverrides[id];
                                        const ride = override ? { ...r, ...override } : r;
                                        return (
                                            <button
                                                key={id}
                                                type="button"
                                                onClick={() => setListModalSelectedId(id)}
                                                className="w-full text-left rounded-lg border border-gray-200 bg-white px-3 py-2 hover:bg-gray-50"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-semibold text-gray-900 truncate">
                                                            {fmtTime(ride.datetime)} · {ride.from} →{" "}
                                                            {ride.to}
                                                        </div>
                                                        <div className="mt-0.5 text-[11px] text-gray-600 truncate">
                                                            {ride.distance ? km(ride.distance) : ""}{" "}
                                                            {mins((ride as any).durationMinutes)
                                                                ? `• ${mins(
                                                                    (ride as any)
                                                                        .durationMinutes,
                                                                )}`
                                                                : ""}
                                                        </div>
                                                    </div>
                                                    <span
                                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getPillStatusColor(
                                                            ride.status,
                                                        )}`}
                                                    >
                                                        <span
                                                            className={`mr-1 h-1.5 w-1.5 rounded-full ${getStatusDotColor(
                                                                ride.status,
                                                            )}`}
                                                        />
                                                        <span className="capitalize">
                                                            {ride.status.replace(/_/g, " ")}
                                                        </span>
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                focusedListRide && (
                                    <div>
                                        <RideSummaryCard
                                            ride={focusedListRide}
                                            onDriverAssigned={(driverUserId) =>
                                                handleDriverAssigned(
                                                    String(focusedListRide._id),
                                                    driverUserId,
                                                )
                                            }
                                            onStatusChanged={handleRideStatusChanged}
                                        />
                                    </div>
                                )
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t px-4 py-3 sm:px-6 sm:py-3">
                            {isListMode ? (
                                <div className="flex justify-end">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={async () => {
                                            setListModal(null);
                                            setListModalSelectedId(null);
                                            await mutate();
                                        }}
                                    >
                                        Close
                                    </Button>
                                </div>
                            ) : (
                                focusedListRide && (
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <Link
                                            href={`/rides/${focusedListRide._id}`}
                                            className="w-full sm:w-auto"
                                        >
                                            <Button size="sm" className="w-full">
                                                Open full ride
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full sm:w-auto"
                                            onClick={() => setListModalSelectedId(null)}
                                        >
                                            Back to list
                                        </Button>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Single ride preview (direct from calendar cell) */}
            {selectedRide && (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
                    onClick={async () => {
                        setSelectedRide(null);
                        await mutate();
                    }}
                >
                    <div
                        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between gap-2 border-b px-4 py-3 sm:px-6 sm:py-4">
                            <div className="min-w-0">
                                <Typography className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                                    {selectedRide.from} → {selectedRide.to}
                                </Typography>
                                <div className="text-xs sm:text-sm text-gray-500 truncate">
                                    {fmtDate(selectedRide.datetime)} •{" "}
                                    {fmtTime(selectedRide.datetime)}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={async () => {
                                    setSelectedRide(null);
                                    await mutate();
                                }}
                                className="ml-2 text-gray-400 hover:text-gray-600 shrink-0"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="max-h-[70vh] overflow-y-auto px-4 py-3 sm:px-6 sm:py-4">
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

                            <RideSummaryCard
                                ride={selectedRide}
                                onDriverAssigned={(driverUserId) =>
                                    handleDriverAssigned(
                                        String(selectedRide._id),
                                        driverUserId,
                                    )
                                }
                                onStatusChanged={handleRideStatusChanged}
                            />
                        </div>

                        {/* Footer */}
                        <div className="border-t px-4 py-3 sm:px-6 sm:py-3">
                            <div className="flex flex-col sm:flex-row gap-2">
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
                                    onClick={async () => {
                                        setSelectedRide(null);
                                        await mutate();
                                    }}
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </ProtectedLayout>
    );
}
