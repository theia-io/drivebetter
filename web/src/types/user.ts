export type Role = "driver" | "dispatcher" | "client" | "admin";

export interface User {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    roles: Role[];
    emailVerified?: boolean;
    createdAt?: string;
    updatedAt?: string;
    notifications?: PushSubscription[];
}

export interface RideCreatorUser {
    _id: string;
    name: string;
    email: string;
    phone?: string;
}
