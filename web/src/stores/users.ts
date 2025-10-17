// web/ui/src/services/users.ts
import useSWR from "swr";
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "@/services/http";
import {Group, User} from "@/types";

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

export const getDriverByIdPublic = (id: string) =>
    apiGet<DriverPublic>(`/users/drivers/${id}`);

export const listAllDriversPublic = () =>
    apiGet<DriverPublic[]>(`/users/drivers`);

export const getUserGroups = (id: string) =>
    apiGet<Group[]>(`/users/${id}/groups`);

export const listDriversPublicBatch = (ids: string[]) =>
    apiPost<DriverPublic[]>(`/users/drivers/batch`, { ids });

/* -------------------------------- Hooks ------------------------------- */

export function useUsers(params?: UsersListQuery) {
    const key = `/users${qs(params)}`;
    return useSWR<UsersPage>(key, () => listUsers(params));
}

export function useUser(id?: string) {
    const key = id ? `/users/${id}` : null;
    return useSWR<User>(key, () => getUser(id as string));
}

export function useUserGroups(id?: string) {
    const key = id ? `/users/${id}/groups` : null;
    return useSWR<Group[]>(key, () => getUserGroups(id as string));
}

export function useDriverByIdPublic(id?: string) {
    return useSWR<DriverPublic>(`/users/drivers/${id}`, getDriverByIdPublic);
}

export function useDriversPublic() {
    return useSWR<DriverPublic[]>(`/users/drivers`, listAllDriversPublic);
}
export function useDriversPublicBatch(ids?: string[]) {
    const key =
        ids && ids.length
            ? [`/users/drivers/batch`, ...ids] // include ids in the SWR key for caching
            : null;

    return useSWR<DriverPublic[]>(
        key,
        () => listDriversPublicBatch(ids as string[])
    );
}

export function useDriversPublicBatchMap(ids?: string[]) {
    const { data, error, isLoading, mutate } = useDriversPublicBatch(ids);
    const map = (data || []).reduce<Record<string, DriverPublic>>((acc, d) => {
        acc[d._id] = d;
        return acc;
    }, {});
    return { data, map, error, isLoading, mutate };
}
