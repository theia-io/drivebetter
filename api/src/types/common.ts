export type Role = "driver" | "dispatcher" | "client" | "admin";

export type RideType = "reservation" | "asap";

export type RideStatus =
    | "unassigned"
    | "assigned"
    | "on_my_way"
    | "on_location"
    | "pob"
    | "completed";

export type PaymentMethod = "cash" | "card" | "qr";

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
