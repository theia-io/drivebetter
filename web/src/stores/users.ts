// web/ui/src/services/users.ts
import useSWR from "swr";
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "@/services/http";
import {User} from "@/types";

/* ------------------------------- Types ------------------------------- */

export type Role = "driver" | "dispatcher" | "client" | "admin";

export type CreateUserRequest = {
    name: string;
    email: string;
    phone?: string;
    roles?: Role[];
    password: string;
};

export type ReplaceUserRequest = {
    name: string;
    email: string;
    phone?: string;
    roles?: Role[];
};

export type UpdateUserRequest = Partial<ReplaceUserRequest>;

export type UsersListQuery = {
    role?: string;
    q?: string;
    page?: number;   // default 1
    limit?: number;  // default 20, max 100
};

export type UsersPage = {
    items: User[];
    page: number;
    limit: number;
    total: number;
    pages: number;
};

export type DriverPublic = {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    roles: string[];
};

/* ------------------------------ Helpers ------------------------------ */

const qs = (params?: Record<string, any>) => {
    if (!params) return "";
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") return;
        sp.set(k, String(v));
    });
    const s = sp.toString();
    return s ? `?${s}` : "";
};

/* -------------------------------- API -------------------------------- */

export const listUsers = (params?: UsersListQuery) =>
    apiGet<UsersPage>(`/users${qs(params)}`);

export const createUser = (payload: CreateUserRequest) =>
    apiPost<User>("/users", payload);

export const getUser = (id: string) =>
    apiGet<User>(`/users/${id}`);

export const replaceUser = (id: string, payload: ReplaceUserRequest) =>
    apiPut<User>(`/users/${id}`, payload);

export const updateUser = (id: string, payload: UpdateUserRequest) =>
    apiPatch<User>(`/users/${id}`, payload);

export const deleteUser = (id: string) =>
    apiDelete<void>(`/users/${id}`);

export const listDriversPublic = () =>
    apiGet<DriverPublic[]>(`/users/drivers`);

export const listDriverByIdPublic = (id: string) =>
    apiGet<DriverPublic>(`/users/drivers/${id}`);

/* -------------------------------- Hooks ------------------------------- */

export function useUsers(params?: UsersListQuery) {
    const key = `/users${qs(params)}`;
    return useSWR<UsersPage>(key, () => listUsers(params));
}

export function useUser(id?: string) {
    const key = id ? `/users/${id}` : null;
    return useSWR<User>(key, () => getUser(id as string));
}

export function useDriverByIdPublic(id?: string) {
    return useSWR<DriverPublic>(`${id}`, listDriverByIdPublic);
}

export function useDriversPublic() {
    return useSWR<DriverPublic[]>(`/users/drivers`, listDriversPublic);
}
