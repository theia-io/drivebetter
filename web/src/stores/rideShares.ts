import { apiGet, apiPost, apiDelete } from "@/services/http";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import {mutate as globalMutate} from "swr/_internal";

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

export type InboxItem = {
    shareId: string | null;
    visibility: "public" | "groups" | "drivers" | null;
    expiresAt: string | null;
    maxClaims: number | null;
    claimsCount: number;
    status?: "active" | "revoked" | "expired" | "closed" | null;
    ride: {
        _id: string;
        from: string;
        to: string;
        datetime: string;
        status: string;
        customer?: { name: string; phone: string };
    };
};

/* -------------------------------- API -------------------------------- */

export const getRideShare = (rideId: string) =>
    apiGet<RideShare[]>(`/rides/${rideId}/share`);

export const getRevokedRideShares = (rideId: string) =>
    apiGet<RideShare[]>(`/rides/${rideId}/share?status=revoked`);

export const createRideShare = (rideId: string, payload: CreateShareRequest) =>
    apiPost<RideShare>(`/rides/${rideId}/share`, payload);

export const revokeRideShare = (shareId: string) =>
    apiDelete<void>(`/ride-shares/${shareId}`);

export const getDriverInbox = (tab: "available" | "claimed" = "available") =>
    apiGet<InboxItem[]>(`/ride-shares/inbox?tab=${tab}`);

export const claimRideShare = (shareId: string) =>
    apiPost<{ status: "claimed"; rideId: string; assignedDriverId: string }>(
        `/ride-shares/${shareId}/claim`,
        {}
    );


const revalidateRideShares = async () => {
    await globalMutate((key) => typeof key === "string" && key.startsWith("/ride-shares"));
};

/* -------------------------------- Hooks ------------------------------- */

export function useCreateRideShare(rideId: string, payload: CreateShareRequest) {
    const key = `/rides/${rideId}/share`;
    return useSWR<RideShare>(key, () => createRideShare(rideId, payload));
}

export function useRideShares(rideId?: string) {
    const key = `/rides/${rideId}/share`;
    return useSWR<RideShare[]>(key, () => getRideShare(rideId));
}

export function useDriverInbox(tab: "available" | "claimed") {
    const key = `/ride-shares/inbox?tab=${tab}`;
    return useSWR<InboxItem[]>(key, () => getDriverInbox(tab));
}

export function useRevokeRideShare(shareId?: string) {
    const key = shareId ? `/ride-shares/${shareId}` : null;
    console.log(key);
    const m = useSWRMutation(
        key,
        async () => {
            await revokeRideShare(shareId as string);
            return { ok: true as const };
        },
        {
            onSuccess: async () => {
                await globalMutate(`/ride-shares/${shareId}`);
                await revalidateRideShares();
            },
        }
    );
    return {
        deleteRide: m.trigger,
        isDeleting: m.isMutating,
        deleteResult: m.data, // { ok: true }
        deleteError: m.error as Error | undefined,
    };
}