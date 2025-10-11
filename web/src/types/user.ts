export type Role = "driver" | "dispatcher" | "client" | "admin";

export interface User {
    _id: string;
    email: string;
    name?: string;
    roles?: Role[];
    emailVerified?: boolean;
    phone?: string;
    createdAt: string;
}
