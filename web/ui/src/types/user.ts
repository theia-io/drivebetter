export type Role = "driver" | "dispatcher" | "client" | "admin";

export interface User {
    id: string;
    email: string;
    name?: string;
    roles?: Role[];
    emailVerified?: boolean;
    phone?: string;
}
