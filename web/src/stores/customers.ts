// web/ui/src/services/customers.ts
"use client";

import useSWR from "swr";
import { mutate as globalMutate } from "swr";
import { apiGet, apiPost, apiPatch } from "@/services/http";

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
