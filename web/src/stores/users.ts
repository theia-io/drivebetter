// web/ui/src/services/users.ts

import useSWR from "swr";
import { apiGet, apiPost } from "@/services/http";
import type { User } from "@/types/user";

/** POST /users payload */
export type CreateUserRequest = {
    name: string;
    email: string;
    phone?: string;
    roles?: string[]; // e.g., ["driver","dispatcher"]
};

/** GET /users/drivers item shape (public fields) */
export type DriverPublic = {
    name: string;
    email: string;
    phone?: string;
    roles: string[];
};

export const listUsers = () => apiGet<User[]>("/users");

export const createUser = (payload: CreateUserRequest) =>
    apiPost<User>("/users", payload);

export const listDriversPublic = () => apiGet<DriverPublic[]>("/users/drivers");

export function useUsers() {
    return useSWR<User[]>("/users", () => listUsers());
}

export function useAllDrivers() {
    return useSWR<DriverPublic[]>("/users/drivers", () => listDriversPublic());
}
