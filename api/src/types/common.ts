// Common role definitions for users
export type Role = "driver" | "dispatcher" | "client" | "admin";

// Ride types
export type RideType = "reservation" | "asap";

// Ride statuses (aligned with MVP spec)
export type RideStatus =
    | "unassigned"
    | "assigned"
    | "on_my_way"
    | "on_location"
    | "pob"
    | "clear";

// Payment methods
export type PaymentMethod = "cash" | "zelle" | "card" | "qr";

// Generic ID type (Mongo ObjectId as string)
export type ID = string;

// Basic place type
export interface Place {
    address: string;
    lat?: number;
    lng?: number;
}

// Basic audit fields
export interface Audit {
    createdAt: Date;
    updatedAt: Date;
}
