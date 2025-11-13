"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import {
    Calendar as CalendarIcon,
    Clock,
    MapPin,
    Navigation,
    DollarSign,
    User,
    X as XIcon,
} from "lucide-react";
import { useRidesInfinite } from "@/stores/rides";
import { Ride } from "@/types";
import { fmtDate, fmtTime, km, money } from "@/services/convertors";

import {
    Calendar as BigCalendar,
    dateFnsLocalizer,
    View,
    Event as RBCEvent,
} from "react-big-calendar";
import {
    format,
    parse,
    startOfWeek,
    getDay,
    addDays,
    addWeeks,
    addMonths,
} from "date-fns";
import {enGB} from "date-fns/locale/en-GB";

import "react-big-calendar/lib/css/react-big-calendar.css";
import Link from "next/link";

/* ---------------------------- Localizer setup ---------------------------- */

const locales = {
    "en-GB": enGB,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 1 }), // Monday
    getDay,
    locales,
});

/* ----------------------------- Types & helpers --------------------------- */

type RideEvent = RBCEvent & {
    resource: Ride;
};

function getStatusColors(status: string) {
    switch (status) {
        case "completed":
            return {
                bg: "#dcfce7",
                border: "#86efac",
                text: "#166534",
            };
        case "assigned":
        case "on_my_way":
        case "on_location":
        case "pob":
        case "clear":
            return {
                bg: "#dbeafe",
                border: "#93c5fd",
                text: "#1d4ed8",
            };
        case "unassigned":
            return {
                bg: "#fef9c3",
                border: "#facc15",
                text: "#854d0e",
            };
        default:
            return {
                bg: "#e5e7eb",
                border: "#9ca3af",
                text: "#111827",
            };
    }
}

/* ------------------------------ Component ------------------------------- */

export default function MyCalendarPage() {
    // Use the same infinite API as /rides, just with a large page size
    // Backend is responsible for restricting visibility (driver vs dispatcher/admin).
    const {
        items: rides,
        isLoading,
    } = useRidesInfinite({}, 500); // 500 per page should be plenty for calendar

    const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
    const [view, setView] = useState<View>("week");
    const [date, setDate] = useState<Date>(new Date());
    const [isMobile, setIsMobile] = useState(false);

    // Simple responsive detection for mobile vs desktop
    useEffect(() => {
        const onResize = () => {
            if (typeof window === "undefined") return;
            setIsMobile(window.innerWidth < 768); // < md breakpoint
        };
        onResize();
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    // Map rides to calendar events
    const events: RideEvent[] = useMemo(
        () =>
            rides.map((ride) => {
                const start = new Date(ride.datetime);
                // We don't have a persisted duration → approximate 1 hour if nothing else
                const durationMinutes = (ride as any).durationMinutes || 60;
                const end = new Date(start.getTime() + durationMinutes * 60_000);

                return {
                    id: ride._id,
                    title: `${ride.from} → ${ride.to}`,
                    start,
                    end,
                    allDay: false,
                    resource: ride,
                };
            }),
        [rides]
    );

    const onSelectEvent = (event: RideEvent) => {
        setSelectedRide(event.resource);
    };

    const onRangeChange = (_range: any) => {
        // could be used later for server-side range queries if you add date-range filtering
    };

    const eventPropGetter = (event: RideEvent) => {
        const ride = event.resource;
        const { bg, border, text } = getStatusColors(ride.status);
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

    const defaultDate = useMemo(() => {
        if (!rides.length) return new Date();
        // center calendar around the soonest upcoming ride if possible
        const upcoming = rides
            .slice()
            .sort(
                (a, b) =>
                    Number(new Date(a.datetime)) - Number(new Date(b.datetime)),
            )[0];
        return new Date(upcoming.datetime);
    }, [rides]);

    // Period label (like Google Calendar)
    const periodLabel = useMemo(() => {
        switch (view) {
            case "month":
                return format(date, "MMMM yyyy");
            case "week": {
                const start = startOfWeek(date, { weekStartsOn: 1 });
                const end = addDays(start, 6);
                const sameMonth = start.getMonth() === end.getMonth();
                const sameYear = start.getFullYear() === end.getFullYear();
                if (sameMonth && sameYear) {
                    return `${format(start, "d")}–${format(end, "d MMM yyyy")}`;
                }
                return `${format(start, "d MMM")} – ${format(
                    end,
                    "d MMM yyyy",
                )}`;
            }
            case "day":
            default:
                return format(date, "PPP");
        }
    }, [view, date]);

    // Navigation helpers
    const handleToday = () => setDate(new Date());

    const handlePrev = () => {
        setDate((current) => {
            switch (view) {
                case "month":
                    return addMonths(current, -1);
                case "week":
                    return addWeeks(current, -1);
                case "day":
                default:
                    return addDays(current, -1);
            }
        });
    };

    const handleNext = () => {
        setDate((current) => {
            switch (view) {
                case "month":
                    return addMonths(current, 1);
                case "week":
                    return addWeeks(current, 1);
                case "day":
                default:
                    return addDays(current, 1);
            }
        });
    };

    const selectedStatusLabel = selectedRide?.status
        ? selectedRide.status.replace(/_/g, " ")
        : "";

    /* ------------------------------ JSX ----------------------------------- */

    return (
        <ProtectedLayout>
            <Container className="px-3 sm:px-6 lg:px-8">
                <div className="space-y-4 sm:space-y-6">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <Typography
                                variant="h1"
                                className="text-xl sm:text-3xl font-bold text-gray-900 truncate"
                            >
                                My Ride Calendar
                            </Typography>
                            <Typography
                                variant="body1"
                                className="text-gray-600 mt-0.5 sm:mt-1 text-xs sm:text-sm"
                            >
                                Rides you created or that are assigned to you, in a calendar
                                view.
                            </Typography>
                        </div>
                    </div>

                    {/* Calendar + Desktop Details */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Calendar */}
                        <Card className="lg:col-span-2" variant="elevated">
                            <CardBody className="p-2 sm:p-4">
                                {/* Custom toolbar */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 sm:mb-4 gap-2">
                                    {/* Left: navigation buttons */}
                                    <div className="flex items-center gap-1 sm:gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handlePrev}
                                            className="px-2 sm:px-3"
                                        >
                                            ‹
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleToday}
                                            className="px-3"
                                        >
                                            Today
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleNext}
                                            className="px-2 sm:px-3"
                                        >
                                            ›
                                        </Button>
                                    </div>

                                    {/* Center: period label */}
                                    <div className="flex-1 flex items-center justify-center gap-2 text-sm font-medium text-gray-900">
                                        <CalendarIcon className="w-4 h-4 text-indigo-600 hidden sm:inline" />
                                        <span className="truncate text-center">
                      {periodLabel}
                    </span>
                                    </div>

                                    {/* Right: view switches */}
                                    <div className="flex items-center gap-1 justify-end">
                                        <Button
                                            size="sm"
                                            className="px-2 sm:px-3 text-xs sm:text-sm"
                                            onClick={() => setView("day")}
                                        >
                                            Day
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="px-2 sm:px-3 text-xs sm:text-sm"
                                            onClick={() => setView("week")}
                                        >
                                            Week
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="px-2 sm:px-3 text-xs sm:text-sm"
                                            onClick={() => setView("month")}
                                        >
                                            Month
                                        </Button>
                                    </div>
                                </div>

                                <div className="h-[600px] sm:h-[700px]">
                                    <BigCalendar
                                        localizer={localizer}
                                        events={events}
                                        startAccessor="start"
                                        endAccessor="end"
                                        view={view}
                                        onView={(v) => setView(v)}
                                        date={date}
                                        onNavigate={(d) => setDate(d)}
                                        onRangeChange={onRangeChange}
                                        onSelectEvent={onSelectEvent}
                                        defaultDate={defaultDate}
                                        eventPropGetter={eventPropGetter}
                                        popup
                                        toolbar={false} // we are using our own toolbar
                                    />
                                </div>
                            </CardBody>
                        </Card>

                        {/* Desktop side details */}
                        <div className="hidden lg:block">
                            <Card variant="elevated" className="h-full">
                                <CardBody className="p-4 space-y-3">
                                    <Typography className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                        <User className="w-4 h-4 text-indigo-600" />
                                        Ride details
                                    </Typography>

                                    {!selectedRide ? (
                                        <div className="text-sm text-gray-600">
                                            Select a ride in the calendar to see details here.
                                        </div>
                                    ) : (
                                        <div className="space-y-2 text-sm text-gray-800">
                                            <div className="flex items-center justify_between">
                                                <div className="font-semibold text-gray-900 truncate">
                                                    {selectedRide.from} → {selectedRide.to}
                                                </div>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-gray-50 capitalize">
                          {selectedStatusLabel}
                        </span>
                                            </div>

                                            <div className="flex items-center text-xs text-gray-600">
                                                <Clock className="w-3 h-3 mr-1 text-gray-400" />
                                                {fmtDate(selectedRide.datetime)} •{" "}
                                                {fmtTime(selectedRide.datetime)}
                                            </div>

                                            <div className="flex items-center text-xs text-gray-600">
                                                <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                                                <span className="truncate">{selectedRide.from}</span>
                                            </div>
                                            <div className="flex items-center text-xs text-gray-600">
                                                <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                                                <span className="truncate">{selectedRide.to}</span>
                                            </div>

                                            <div className="flex items-center text-xs text-gray-600">
                                                <Navigation className="w-3 h-3 mr-1 text-gray-400" />
                                                <span>{km(selectedRide.distance)}</span>
                                            </div>

                                            <div className="flex items-center text-xs text-gray-600">
                                                <DollarSign className="w-3 h-3 mr-1 text-gray-400" />
                                                <span>{money(selectedRide.payment?.amountCents)}</span>
                                            </div>

                                            <div className="pt-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full"
                                                >
                                                    <Link href={`/rides/${selectedRide._id}`}>Open ride</Link>
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </div>
                    </div>

                    {/* Mobile bottom sheet for selected ride */}
                    {isMobile && selectedRide && (
                        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:hidden">
                            <div className="w-full max-w-md bg_white rounded-t-2xl shadow-lg p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <Typography className="text-sm font-semibold text-gray-900">
                                        Ride details
                                    </Typography>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRide(null)}
                                        className="p-1 rounded-full hover:bg-gray-100"
                                        aria-label="Close"
                                    >
                                        <XIcon className="w-4 h-4 text-gray-500" />
                                    </button>
                                </div>

                                <div className="space-y-2 text-sm text-gray-800">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="font-semibold text-gray-900 truncate">
                                            {selectedRide.from} → {selectedRide.to}
                                        </div>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border bg-gray-50 capitalize">
                      {selectedStatusLabel}
                    </span>
                                    </div>

                                    <div className="flex items-center text-xs text-gray-600">
                                        <Clock className="w-3 h-3 mr-1 text-gray-400" />
                                        {fmtDate(selectedRide.datetime)} •{" "}
                                        {fmtTime(selectedRide.datetime)}
                                    </div>

                                    <div className="flex items-center text-xs text-gray-600">
                                        <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                                        <span className="truncate">{selectedRide.from}</span>
                                    </div>
                                    <div className="flex items_center text-xs text-gray-600">
                                        <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                                        <span className="truncate">{selectedRide.to}</span>
                                    </div>

                                    <div className="flex items-center text-xs text-gray-600">
                                        <Navigation className="w-3 h-3 mr-1 text-gray-400" />
                                        <span>{km(selectedRide.distance)}</span>
                                    </div>

                                    <div className="flex items-center text-xs text-gray-600">
                                        <DollarSign className="w-3 h-3 mr-1 text-gray-400" />
                                        <span>{money(selectedRide.payment?.amountCents)}</span>
                                    </div>

                                    <div className="pt-2 flex gap-2">
                                        <Button
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => setSelectedRide(null)}
                                        >
                                            <Link href={`/rides/${selectedRide._id}`}>Open ride</Link>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => setSelectedRide(null)}
                                        >
                                            Close
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Loading / empty states */}
                    {isLoading && (
                        <div className="text-sm text-gray-600 mt-2">
                            Loading your rides…
                        </div>
                    )}
                    {!isLoading && rides.length === 0 && (
                        <div className="text-sm text-gray-600 mt-2">
                            No rides yet. Create a ride or get assigned to one, and it will
                            appear here.
                        </div>
                    )}
                </div>
            </Container>
        </ProtectedLayout>
    );
}
