import {apiGet, apiPost, apiDelete, apiPatch} from "@/services/http";
import useSWR from "swr";

export type RideShareVisibility = "public" | "groups" | "drivers";

export type RideShare = {
    shareId: string;
    rideId: string;
    visibility: RideShareVisibility;
    groupIds?: string[];
    driverIds?: string[];
    url: string;
    expiresAt?: string | null;
    maxClaims?: number | null;
    status: "active" | "revoked" | "expired";
    createdAt?: string;
};

export type CreateShareRequest = {
    visibility: RideShareVisibility;
    groupIds?: string[];
    driverIds?: string[];
    expiresAt?: string | null; // ISO
    maxClaims?: number;
    syncQueue?: boolean; // default true
};

export type UpdateShareRequest = Partial<{
    visibility: RideShareVisibility;
    groupIds: string[];
    driverIds: string[];
    expiresAt: string | null;
    maxClaims: number | null;
    syncQueue: boolean;
}>;

/* -------------------------------- API -------------------------------- */

export const getRideShare = (rideId: string) =>
    apiGet<RideShare[]>(`/rides/${rideId}/share`);

export const getRevokedRideShares = (rideId: string) =>
    apiGet<RideShare[]>(`/rides/${rideId}/share?status=revoked`);

export const createRideShare = (rideId: string, payload: CreateShareRequest) =>
    apiPost<RideShare>(`/rides/${rideId}/share`, payload);

export const revokeRideShare = (shareId: string) =>
    apiDelete<void>(`/ride-shares/${shareId}`);

export const updateRideShare = (shareId: string, payload: UpdateShareRequest) =>
    apiPatch<RideShare>(`/ride-shares/${shareId}`, payload); // if you prefer PATCH, switch apiPost->apiPatch

/* -------------------------------- Hooks ------------------------------- */

export function useCreateRideShare(rideId: string, payload: CreateShareRequest) {
    const key = `/rides/${rideId}/share`;
    return useSWR<RideShare>(key, () => createRideShare(rideId, payload));
}

export function useRideShares(rideId?: string) {
    const key = `/rides/${rideId}/share`;
    return useSWR<RideShare[]>(key, () => getRideShare(rideId));
}