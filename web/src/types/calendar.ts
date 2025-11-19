import type { Ride } from "./ride";

export interface CalendarDay {
    day: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    hasRides: boolean;
    rides?: Ride[];
}

export interface CalendarEvent {
    id: string;
    title: string;
    start: string;
    end?: string;
    type: "ride" | "break" | "maintenance";
    status: "scheduled" | "in-progress" | "completed" | "cancelled";
    ride?: Ride;
}

export interface CalendarStats {
    totalRides: number;
    earnings: number;
    distance: number;
    averageRating: number;
}

export interface CalendarFilters {
    dateRange?: {
        start: string;
        end: string;
    };
    status?: string[];
    type?: string[];
}
