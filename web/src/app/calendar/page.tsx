"use client";

import { useMemo, useState } from "react";
import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import {
    Calendar as CalendarIcon,
    Clock,
    DollarSign,
    MapPin,
    Navigation,
    Star,
    User,
} from "lucide-react";
import { Calendar as BigCalendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { useMyRides } from "@/stores/rides";
import { Ride } from "@/types";
import { fmtDate, fmtTime, km, mins, money } from "@/services/convertors";
import { useAuthStore } from "@/stores";

import "react-big-calendar/lib/css/react-big-calendar.css";
import {enGB} from "date-fns/locale/en-GB";
import Link from "next/link";

/* --------------------- Big Calendar Localizer --------------------- */

const locales = {
    "en-GB": enGB,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), // Monday
    getDay,
    locales,
});

/* ------------------------ Types & helpers ------------------------- */

type CalendarEvent = {
    id: string;
    title: string;
    start: Date;
    end: Date;
    ride: Ride;
};

function statusColor(status: Ride["status"]) {
    switch (status) {
        case "completed":
            return "#22c55e"; // green-500
        case "assigned":
        case "on_my_way":
        case "on_location":
        case "pob":
        case "clear":
            return "#3b82f6"; // blue-500
        case "unassigned":
            return "#eab308"; // yellow-500
        default:
            return "#6b7280"; // gray-500
    }
}

function statusLabel(status: Ride["status"]) {
    return status.replace(/_/g, " ");
}

/* --------------------------- Component ---------------------------- */

export default function DriverCalendarPage() {
    const { user } = useAuthStore();
    const userId = user?._id as string | undefined;

    const { data, isLoading } = useMyRides();
    const rides = data?.items ?? [];

    const [view, setView] = useState<View>("week");
    const [date, setDate] = useState<Date>(new Date());
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

    // Map rides to calendar events
    const events: CalendarEvent[] = useMemo(() => {
        return rides.map((ride) => {
            const start = new Date(ride.datetime);
            const durationMinutes =
                typeof (ride as any).durationMinutes === "number" && (ride as any).durationMinutes > 0
                    ? (ride as any).durationMinutes
                    : 60; // fallback to 1h
            const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

            return {
                id: ride._id,
                title: `${ride.from} → ${ride.to}`,
                start,
                end,
                ride,
            };
        });
    }, [rides]);

    // Filter to only rides created by or assigned to current user (if backend doesn't already do it)
    const filteredEvents = useMemo(() => {
        if (!userId) return events;
        return events.filter((ev) => {
            const r = ev.ride as any;
            const creatorId = r.creatorId?.toString?.() ?? r.creatorId;
            const assignedId = r.assignedDriverId?.toString?.() ?? r.assignedDriverId;
            return creatorId === userId || assignedId === userId;
        });
    }, [events, userId]);

    const onSelectEvent = (event: CalendarEvent) => {
        setSelectedEvent(event);
    };

    const onSelectSlot = () => {
        // Clicking empty slot hides preview
        setSelectedEvent(null);
    };

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
                                My Calendar
                            </Typography>
                            <Typography
                                variant="body1"
                                className="text-gray-600 mt-0.5 sm:mt-2 text-xs sm:text-base"
                            >
                                See rides you created or are assigned to
                            </Typography>
                        </div>
                    </div>

                    {/* Legend */}
                    <Card variant="elevated">
                        <CardBody className="p-3 sm:p-4 flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                <span
                    className="w-3 h-3 rounded-full inline-block"
                    style={{ backgroundColor: statusColor("unassigned") }}
                />
                                <span>Unassigned</span>
                            </div>
                            <div className="flex items-center gap-2">
                <span
                    className="w-3 h-3 rounded-full inline-block"
                    style={{ backgroundColor: statusColor("assigned") }}
                />
                                <span>In progress</span>
                            </div>
                            <div className="flex items-center gap-2">
                <span
                    className="w-3 h-3 rounded-full inline-block"
                    style={{ backgroundColor: statusColor("completed") }}
                />
                                <span>Completed</span>
                            </div>
                            <div className="ml-auto flex items-center gap-2 text-gray-500 text-[11px] sm:text-xs">
                                <CalendarIcon className="w-4 h-4" />
                                Click a ride to see details
                            </div>
                        </CardBody>
                    </Card>

                    {/* Layout: calendar + preview card (stack on mobile, side-by-side on desktop) */}
                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-4 sm:gap-6 items-start">
                        {/* Calendar */}
                        <Card variant="elevated" className="overflow-hidden">
                            <CardBody className="p-2 sm:p-4">
                                <BigCalendar
                                    localizer={localizer}
                                    events={filteredEvents}
                                    startAccessor="start"
                                    endAccessor="end"
                                    style={{ height: 600 }}
                                    view={view}
                                    onView={(v) => setView(v)}
                                    date={date}
                                    onNavigate={(d) => setDate(d)}
                                    selectable
                                    onSelectEvent={onSelectEvent}
                                    onSelectSlot={onSelectSlot}
                                    popup
                                    eventPropGetter={(event) => {
                                        const s = statusColor(event.ride.status);
                                        const isCreatedByMe =
                                            userId &&
                                            ((event.ride as any).creatorId?.toString?.() ?? (event.ride as any).creatorId) ===
                                            userId;

                                        return {
                                            style: {
                                                backgroundColor: s,
                                                borderRadius: "6px",
                                                border: isCreatedByMe ? "2px solid #111827" : "1px solid #e5e7eb",
                                                color: "#ffffff",
                                                fontSize: "12px",
                                                padding: "2px 4px",
                                            },
                                        };
                                    }}
                                    components={{
                                        event: ({ event }) => (
                                            <span className="flex flex-col leading-tight">
                        <span className="font-semibold truncate">{event.title}</span>
                        <span className="text-[10px] opacity-80">
                          {statusLabel(event.ride.status)}
                        </span>
                      </span>
                                        ),
                                    }}
                                />
                            </CardBody>
                        </Card>

                        {/* Preview card */}
                        <div className="space-y-3">
                            {isLoading && (
                                <Card variant="elevated">
                                    <CardBody className="p-4 text-sm text-gray-600">Loading rides…</CardBody>
                                </Card>
                            )}

                            {!isLoading && !selectedEvent && (
                                <Card variant="elevated">
                                    <CardBody className="p-4 text-sm text-gray-600">
                                        Select a ride on the calendar to see quick details here.
                                    </CardBody>
                                </Card>
                            )}

                            {selectedEvent && (
                                <Card variant="elevated" className="shadow-lg">
                                    <CardBody className="p-4 sm:p-5 space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <Typography className="text-sm sm:text-lg font-semibold text-gray-900">
                                                    {selectedEvent.ride.from} → {selectedEvent.ride.to}
                                                </Typography>
                                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-600">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                              {fmtDate(selectedEvent.ride.datetime)} •{" "}
                              {fmtTime(selectedEvent.ride.datetime)}
                          </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                        <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border"
                            style={{
                                borderColor: statusColor(selectedEvent.ride.status),
                                color: statusColor(selectedEvent.ride.status),
                            }}
                        >
                          {selectedEvent.ride.status === "completed" ? (
                              <Star className="w-3 h-3 mr-1" />
                          ) : (
                              <Navigation className="w-3 h-3 mr-1" />
                          )}
                            {statusLabel(selectedEvent.ride.status)}
                        </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-2 text-xs sm:text-sm text-gray-700">
                                            <div className="flex items-center">
                                                <MapPin className="w-3 h-3 mr-1.5 text-gray-400" />
                                                <span className="font-medium mr-1">From:</span>
                                                <span className="truncate">{selectedEvent.ride.from}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <MapPin className="w-3 h-3 mr-1.5 text-gray-400" />
                                                <span className="font-medium mr-1">To:</span>
                                                <span className="truncate">{selectedEvent.ride.to}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <Navigation className="w-3 h-3 mr-1.5 text-gray-400" />
                                                <span className="font-medium mr-1">Distance:</span>
                                                <span>{km(selectedEvent.ride.distance)}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <Clock className="w-3 h-3 mr-1.5 text-gray-400" />
                                                <span className="font-medium mr-1">ETA:</span>
                                                <span>{mins((selectedEvent.ride as any).durationMinutes)}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <DollarSign className="w-3 h-3 mr-1.5 text-gray-400" />
                                                <span className="font-medium mr-1">Fare:</span>
                                                <span>{money(selectedEvent.ride.payment?.amountCents)}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <User className="w-3 h-3 mr-1.5 text-gray-400" />
                                                <span className="font-medium mr-1">
                          {userId &&
                          ((selectedEvent.ride as any).creatorId?.toString?.() ??
                              (selectedEvent.ride as any).creatorId) === userId
                              ? "Created by you"
                              : "Assigned to you"}
                        </span>
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="w-full sm:w-auto">
                                                <Link href={`/rides/${selectedEvent.ride._id}`}>Open full details</Link>
                                            </Button>
                                        </div>
                                    </CardBody>
                                </Card>
                            )}
                        </div>
                    </div>
                </div>
            </Container>
        </ProtectedLayout>
    );
}
