// stores/rideClaims.ts
import { apiGet, apiPost, apiDelete } from "@/services/http";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { mutate as globalMutate } from "swr/_internal";

/* ============================= Types ============================= */

export type RideClaimStatus = "queued" | "approved" | "rejected" | "withdrawn";

export type RideClaim = {
    claimId: string;          // Mongo _id
    status: RideClaimStatus;
    driverId: string;
    shareId: string | null;
    createdAt: string;
};

export type QueueClaimResponse = {
    status: "queued";
    claimId: string;
    rideId: string;
    shareId: string;
};

export type InboxItem = {
    shareId: string | null;
    visibility: "public" | "groups" | "drivers" | null;
    expiresAt: string | null;
    maxClaims: number | null;
    claimsCount: number;
    status?: string | null;
    myClaim?: { claimId: string; status: "queued" | "approved"; createdAt?: string } | null;
    ride: {
        _id: string;
        from: string;
        to: string;
        datetime: string;
        status: string;
        fromLocation?: any;
        toLocation?: any;
        customer?: { name?: string; phone?: string };
    };
};

export type InboxCount = { count: number };

/* ============================== API ============================= */

// Driver → queue a claim for a share
export const queueRideClaim = (shareId: string) =>
    apiPost<QueueClaimResponse>(`/ride-shares/${shareId}/claim`, {});

// Dispatcher/Admin → list claims for a ride
export const getRideClaims = (rideId: string) =>
    apiGet<RideClaim[]>(`/rides/${rideId}/claims`);

// Dispatcher/Admin → approve a claim (assigns ride, rejects others, closes shares)
export const approveRideClaim = (rideId: string, claimId: string) =>
    apiPost<{ ok: true; status: "assigned" }>(`/rides/${rideId}/claims/${claimId}/approve`, {});

// Dispatcher/Admin → reject a queued claim
export const rejectRideClaim = (rideId: string, claimId: string) =>
    apiPost<{ ok: true }>(`/rides/${rideId}/claims/${claimId}/reject`, {});

// Driver → withdraw own queued claim
export const withdrawRideClaim = (rideId: string, claimId: string) =>
    apiDelete<{ ok: true }>(`/rides/${rideId}/claims/${claimId}`);

// Driver → inbox lists + count
export const getDriverInbox = (tab: "available" | "claimed") =>
    apiGet<InboxItem[]>(`/ride-shares/inbox?tab=${tab}`);

export const getDriverInboxCount = (tab: "available" | "claimed") =>
    apiGet<InboxCount>(`/ride-shares/inbox/count?tab=${tab}`);

/* ============================== Hooks =========================== */

export const revalidateRide = async (rideId?: string) => {
    if (!rideId) return;
    await Promise.all([
        globalMutate((key) => typeof key === "string" && key.startsWith(`/rides/${rideId}`)),
        globalMutate((key) => typeof key === "string" && key.startsWith(`/rides`)),
        globalMutate((key) => typeof key === "string" && key.startsWith(`/ride-shares`)),
        globalMutate((key) => typeof key === "string" && key.startsWith(`/ride-claims`)),
        globalMutate((key) => typeof key === "string" && key.startsWith(`/ride-shares/inbox`)),
    ]);
};

// Claims list
export function useRideClaims(rideId?: string) {
    const key = rideId ? `/rides/${rideId}/claims` : null;
    return useSWR<RideClaim[]>(key, () => getRideClaims(rideId as string));
}

// ✅ Queue claim (driver) — parameterless hook, pass shareId to trigger
export function useQueueRideClaim() {
    const m = useSWRMutation(
        "/ride-shares/claim",
        async (_key, { arg }: { arg: string }) => queueRideClaim(arg),
        {
            onSuccess: async (res) => {
                await revalidateRide(res?.rideId);
                // also revalidate inbox lists
                await Promise.all([
                    globalMutate(`/ride-shares/inbox?tab=available`),
                    globalMutate(`/ride-shares/inbox?tab=claimed`),
                    globalMutate(`/ride-shares/inbox/count?tab=available`),
                ]);
            },
        }
    );
    return {
        queue: (shareId: string) => m.trigger(shareId, { throwOnError: true }),
        isQueuing: m.isMutating,
        queueResult: m.data,
        queueError: m.error as Error | undefined,
    };
}

// Approve claim (dispatcher/admin)
export function useApproveRideClaim(rideId?: string) {
    const m = useSWRMutation(
        rideId ? `/rides/${rideId}/claims/approve` : null,
        async (_key, { arg: claimId }: { arg: string }) => approveRideClaim(rideId as string, claimId),
        { onSuccess: async () => { await revalidateRide(rideId); } }
    );
    return {
        approve: m.trigger, // pass claimId
        isApproving: m.isMutating,
        approveResult: m.data,
        approveError: m.error as Error | undefined,
    };
}

// Reject claim (dispatcher/admin)
export function useRejectRideClaim(rideId?: string) {
    const m = useSWRMutation(
        rideId ? `/rides/${rideId}/claims/reject` : null,
        async (_key, { arg: claimId }: { arg: string }) => rejectRideClaim(rideId as string, claimId),
        { onSuccess: async () => { await revalidateRide(rideId); } }
    );
    return {
        reject: m.trigger, // pass claimId
        isRejecting: m.isMutating,
        rejectResult: m.data,
        rejectError: m.error as Error | undefined,
    };
}

// Withdraw claim (driver)
export function useWithdrawRideClaim(rideId?: string) {
    const m = useSWRMutation(
        rideId ? `/rides/${rideId}/claims/withdraw` : null,
        async (_key, { arg: claimId }: { arg: string }) => withdrawRideClaim(rideId as string, claimId),
        { onSuccess: async () => { await revalidateRide(rideId); } }
    );
    return {
        withdraw: m.trigger, // pass claimId
        isWithdrawing: m.isMutating,
        withdrawResult: m.data,
        withdrawError: m.error as Error | undefined,
    };
}

export function useDriverInbox(tab: "available" | "claimed") {
    const key = `/ride-shares/inbox?tab=${tab}`;
    return useSWR<InboxItem[]>(key, () => getDriverInbox(tab));
}

export function useDriverInboxCount(tab?: "available" | "claimed") {
    const key = tab ? `/ride-shares/inbox/count?tab=${tab}` : null;
    return useSWR<InboxCount>(key, () => getDriverInboxCount(tab as "available" | "claimed"));
}

