// web/ui/src/services/users.ts
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { apiGet, apiPost, apiPatch, apiPut, apiDelete } from "@/services/http";
import type { User } from "@/types/user";

/* ------------------------------- Types ------------------------------- */

export type CreateUserRequest = {
    name: string;
    email: string;
    phone?: string;
    roles?: string[]; // ["driver","dispatcher",...]
};

export type UpdateUserRequest = Partial<CreateUserRequest>;

export type UsersQuery = {
    q?: string;
    role?: string;   // "driver" | "dispatcher" | "client" | "admin"
    page?: number;
    limit?: number;
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

/* ------------------------------ Utilities ----------------------------- */

const q = (params?: Record<string, any>) => {
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

export const listUsers = (params?: UsersQuery) =>
    apiGet<UsersPage>(`/users${q(params)}`);

export const getUser = (id: string) =>
    apiGet<User>(`/users/${id}`);

export const createUser = (payload: CreateUserRequest) =>
    apiPost<User>("/users", payload);

export const replaceUser = (id: string, payload: CreateUserRequest) =>
    apiPut<User>(`/users/${id}`, payload);

export const updateUser = (id: string, payload: UpdateUserRequest) =>
    apiPatch<User>(`/users/${id}`, payload);

export const deleteUser = (id: string) =>
    apiDelete<void>(`/users/${id}`);

export const listDriversPublic = () =>
    apiGet<DriverPublic[]>(`/users/drivers`);

/* -------------------------------- Hooks ------------------------------- */

export function useUsers(params?: UsersQuery) {
    const key = `/users${q(params)}`;
    return useSWR<UsersPage>(key, () => listUsers(params));
}

export function useUsersInfinite(base?: Omit<UsersQuery, "page" | "limit">, pageSize = 20) {
    const getKey = (index: number, prev: UsersPage | null) => {
        if (prev && prev.items.length === 0) return null;
        const params: UsersQuery = { ...(base || {}), page: index + 1, limit: pageSize };
        return `/users${q(params)}`;
    };
    const swr = useSWRInfinite<UsersPage>(getKey, (key: string) => apiGet<UsersPage>(key));
    const flat: User[] = (swr.data || []).flatMap((p) => p.items);
    const totalPages = swr.data?.[0]?.pages ?? 1;
    const reachedEnd = swr.size >= totalPages;
    return { ...swr, items: flat, reachedEnd, totalPages };
}

export function useUser(id?: string) {
    const key = id ? `/users/${id}` : null;
    return useSWR<User>(key, () => getUser(id as string));
}

export function useAllDrivers() {
    return useSWR<DriverPublic[]>("/users/drivers", () => listDriversPublic());
}
