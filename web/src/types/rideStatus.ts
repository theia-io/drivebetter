// src/types/rideStatus.ts

import { Car, Check, MapPin, Navigation, User, Users } from "lucide-react";

export type RideStatus =
    | "unassigned"
    | "assigned"
    | "on_my_way"
    | "on_location"
    | "pob"
    | "completed";

/** Canonical lifecycle order for all UI (stepper, analytics, etc.) */
export const STATUS_FLOW: RideStatus[] = [
    "unassigned",
    "assigned",
    "on_my_way",
    "on_location",
    "pob",
    "completed",
];

export type RideStatusColors = {
    bg: string;
    border: string;
    text: string;
};

export type RideStatusMeta = {
    value: RideStatus;
    label: string;
    description: string;
};

export function getStatusIcon(status: RideStatus) {
    switch (status) {
        case "unassigned":
            return User;
        case "assigned":
            return Users;
        case "on_my_way":
            return Navigation;
        case "on_location":
            return MapPin;
        case "pob":
            return Car;
        case "completed":
            return Check;
        default:
            return User;
    }
}

export const STATUS_OPTIONS: RideStatusMeta[] = [
    {
        value: "unassigned",
        label: "Unassigned",
        description: "No driver assigned yet.",
    },
    {
        value: "assigned",
        label: "Assigned",
        description: "Driver accepted the ride.",
    },
    {
        value: "on_my_way",
        label: "On my way",
        description: "Driver is heading to pickup location.",
    },
    {
        value: "on_location",
        label: "On location",
        description: "Driver arrived at pickup location.",
    },
    {
        value: "pob",
        label: "Passenger on board",
        description: "Passenger is in the car.",
    },
    {
        value: "completed",
        label: "Completed",
        description: "Ride fully closed and settled.",
    },
];

// per-status hex palette (for backgrounds/borders)
const STATUS_COLOR_MAP: Record<RideStatus, RideStatusColors> = {
    unassigned: {
        bg: "#fef3c7", // amber-100
        border: "#fbbf24", // amber-400
        text: "#92400e", // amber-800
    },
    assigned: {
        bg: "#dbeafe", // blue-100
        border: "#60a5fa", // blue-400
        text: "#1d4ed8", // blue-700
    },
    on_my_way: {
        bg: "#e0f2fe", // sky-100
        border: "#38bdf8", // sky-400
        text: "#0369a1", // sky-800
    },
    on_location: {
        bg: "#ede9fe", // violet-100
        border: "#a78bfa", // violet-400
        text: "#4c1d95", // violet-800
    },
    pob: {
        bg: "#cffafe", // cyan-100
        border: "#22d3ee", // cyan-400
        text: "#155e75", // cyan-800
    },
    completed: {
        bg: "#dcfce7", // emerald-100
        border: "#6ee7b7", // emerald-300
        text: "#166534", // emerald-800
    },
};

// tailwind pill classes for badges
const PILL_COLOR_MAP: Record<RideStatus, string> = {
    unassigned: "bg-amber-100 text-amber-800 border-amber-200",
    assigned: "bg-blue-100 text-blue-800 border-blue-200",
    on_my_way: "bg-sky-100 text-sky-800 border-sky-200",
    on_location: "bg-violet-100 text-violet-800 border-violet-200",
    pob: "bg-cyan-100 text-cyan-800 border-cyan-200",
    completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

// tailwind classes for tiny dots
const DOT_COLOR_MAP: Record<RideStatus, string> = {
    unassigned: "bg-amber-500",
    assigned: "bg-blue-500",
    on_my_way: "bg-sky-500",
    on_location: "bg-violet-500",
    pob: "bg-cyan-500",
    completed: "bg-emerald-500",
};

const FALLBACK_COLORS: RideStatusColors = {
    bg: "#e5e7eb",
    border: "#9ca3af",
    text: "#111827",
};

export function getStatusLabel(status: string): string {
    const meta = STATUS_OPTIONS.find((s) => s.value === status);
    if (meta) return meta.label;
    return status.replace(/_/g, " ");
}

export function getStatusMeta(status: string): RideStatusMeta | null {
    const meta = STATUS_OPTIONS.find((s) => s.value === status);
    return meta ?? null;
}

export function getStatusColors(status: string): RideStatusColors {
    if ((status as RideStatus) in STATUS_COLOR_MAP) {
        return STATUS_COLOR_MAP[status as RideStatus];
    }
    return FALLBACK_COLORS;
}

export function getPillStatusColor(status: string): string {
    if ((status as RideStatus) in PILL_COLOR_MAP) {
        return PILL_COLOR_MAP[status as RideStatus];
    }
    return "bg-gray-100 text-gray-800 border-gray-200";
}

export function getStatusDotColor(status: string): string {
    if ((status as RideStatus) in DOT_COLOR_MAP) {
        return DOT_COLOR_MAP[status as RideStatus];
    }
    return "bg-gray-400";
}
