// web/ui/src/services/customers.ts
"use client";

import useSWR, {SWRConfiguration} from "swr";
import { mutate as globalMutate } from "swr";
import { apiGet, apiPost, apiPatch } from "@/services/http";
import {Ride} from "@/types";

/* ------------------------------- Types ------------------------------- */

export interface CustomerInvite {
    _id: string;
    email: string;
    invitedBy: string;
    code: string;
    message?: string;
    expiresAt?: string | null;
    usedBy?: string | null;
    usedAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

export type CustomerInviteStatus = "pending" | "used" | "expired";

export interface MyCustomerInvite {
    _id: string;
    email: string;
    code: string;
    status: CustomerInviteStatus;
    expiresAt: string | null;
    usedAt: string | null;
    createdAt: string;
}

export interface CustomerInviteMeta {
    email: string;
    invitedBy: {
        _id: string;
        name?: string;
        email?: string;
    } | null;
    status: CustomerInviteStatus;
    expiresAt: string | null;
    usedAt: string | null;
}

export interface CustomerProfile {
    _id: string;
    userId: string;
    invitedBy: string;
    age?: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CustomerMeResponse {
    user: any; // use shared User type if available
    profile: CustomerProfile | null;
    invitedBy: {
        _id: string;
        name?: string;
        email?: string;
    } | null;
}

export type CustomerRegisterPayload = {
    code: string;
    name: string;
    password: string;
    phone?: string;
    age?: number;
}

export interface CustomerRegisterResponse {
    user: any;
    customerProfile: CustomerProfile;
}

export type CreateCustomerInvitePayload = {
    email: string;
    message?: string;
    expiresAt?: string | null;
}

export type UpdateCustomerMePayload = {
    name?: string;
    phone?: string;
    age?: number;
}

export interface MyCustomerStats {
    ridesTotal?: number;
    lastRideAt?: string | null;
}

export interface MyCustomer {
    user: any; // backend User shape; reuse concrete type if present
    profile: CustomerProfile | null;
    stats?: MyCustomerStats | null;
}

export type CustomerRidesResponse = {
    data: Ride[];
    page: number;
    limit: number;
    total: number;
};

// ---------- Plain API function ----------

/**
 * Fetch rides assigned to a given customer (user or profile id).
 *
 * Internally calls GET /customers/{id}/rides?page=&limit=
 * API prefix (/api/v1) is handled inside request().
 */
export function getCustomerRides(
    customerId: string,
    params?: { page?: number; limit?: number },
) {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 10;

    const query = new URLSearchParams();
    query.set("page", String(page));
    query.set("limit", String(limit));

    const path = `/customers/${encodeURIComponent(customerId)}/rides?${query.toString()}`;

    return apiGet<CustomerRidesResponse>(path);
}

/**
 * Fetch a single ride for the logged-in customer.
 * Uses /customers/me/rides/:rideId
 */
export const getCustomerRide = async (rideId: string): Promise<Ride> => {
    return await apiGet<Ride>(`/customers/me/rides/${rideId}`);
};

/**
 * SWR hook for a single ride (customer-safe).
 */
export const useCustomerRide = (
    rideId?: string,
    config?: SWRConfiguration<Ride>,
) => {
    const key = rideId ? `/customers/me/rides/${rideId}` : null;

    return useSWR<Ride>(
        key,
        async (url: string) => {
            return await apiGet<Ride>(url);
        },
        config,
    );
}

export function useCustomerRides(
    customerId?: string,
    options?: { page?: number; limit?: number; enabled?: boolean },
) {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 10;
    const enabled = options?.enabled ?? true;

    const key =
        customerId && enabled
            ? `/customers/${encodeURIComponent(customerId)}/rides?page=${page}&limit=${limit}`
            : null;

    const { data, error, isLoading, mutate } = useSWR(
        key,
        (url: string) => {
            return apiGet<CustomerRidesResponse>(url);
        },
    );

    return {
        data: data?.data ?? [],
        page: data?.page ?? page,
        limit: data?.limit ?? limit,
        total: data?.total ?? 0,
        error,
        mutate,
        isLoading,
    };
}


/* -------------------------------- API -------------------------------- */

export const listMyCustomers = () => apiGet<MyCustomer[]>(`/customers`);

export const createCustomerInvite = (payload: CreateCustomerInvitePayload) =>
    apiPost<CustomerInvite>("/customers/invites", payload);

export const getCustomerInviteByCode = (code: string) =>
    apiGet<CustomerInviteMeta>(`/customers/invites/${encodeURIComponent(code)}`, {
        noAuth: true, // invite lookup is public
    });

export const registerCustomer = (payload: CustomerRegisterPayload) =>
    apiPost<CustomerRegisterResponse>("/customers/register", payload, { noAuth: true });

export const getCustomerMe = () =>
    apiGet<CustomerMeResponse>("/customers/me");

export const updateCustomerMe = (payload: UpdateCustomerMePayload) =>
    apiPatch<CustomerMeResponse>("/customers/me", payload);

export function listMyCustomerInvites() {
    return apiGet<MyCustomerInvite[]>("/customers/invites");
}

export function useMyCustomerInvites() {
    return useSWR<MyCustomerInvite[]>("/customers/invites", listMyCustomerInvites);
}
/* -------------------------------- Hooks ------------------------------- */

export function useMyCustomers() {
    const key = `/customers`;
    return useSWR<MyCustomer[]>(key, () => listMyCustomers());
}

export function useCustomerMe() {
    const key = `/customers/me`;
    return useSWR<CustomerMeResponse>(key, () => getCustomerMe());
}

export function useCustomerInvite(code?: string) {
    const key = code ? `/customers/invites/${code}` : null;
    return useSWR<CustomerInviteMeta | undefined>(
        key,
        () => (code ? getCustomerInviteByCode(code) : Promise.resolve(undefined)),
    );
}

/* --------------------------- Convenience helpers --------------------------- */

export async function patchCustomerMeAndRevalidate(payload: UpdateCustomerMePayload) {
    const updated = await updateCustomerMe(payload);
    await globalMutate(`/customers/me`);
    return updated;
}
