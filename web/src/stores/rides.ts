// web/ui/src/services/rides.ts

import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import useSWRMutation from 'swr/mutation';
import { mutate as globalMutate } from "swr";
import { apiGet, apiPost, apiPatch, apiPut, apiDelete } from "@/services/http";

/* ------------------------------- Types ------------------------------- */

export type RideStatus =
    | "unassigned"
    | "assigned"
    | "on_my_way"
    | "on_location"
    | "pob"
    | "clear"
    | "completed";

export type RideType = "reservation" | "asap";

export type GeoPoint = {
    type: "Point";
    coordinates: [number, number]; // [lon, lat]
};

export type Ride = {
    _id: string;
    creatorId?: string | null;
    clientId?: string | null;
    from: string;
    to: string;
    stops?: string[];
    fromLocation?: GeoPoint;
    toLocation?: GeoPoint;
    stopLocations?: GeoPoint[];
    fromPlaceId?: string;
    toPlaceId?: string;
    geocoder?: "mapbox" | "google" | "nominatim" | "pelias";
    geoAccuracy?: number;
    geocodedAt?: string;

    datetime: string; // ISO
    type: RideType;
    queue: string[];
    assignedDriverId?: string | null;
    coveredVisible: boolean;
    status: RideStatus;
    notes?: string;

    payment?: {
        method?: "cash" | "zelle" | "card" | "qr";
        paid?: boolean;
        driverPaid?: boolean;
        amountCents?: number;
    };

    createdAt: string;
    updatedAt: string;
};

export type CreateRideRequest = {
    creatorId?: string;
    clientId?: string;
    assignedDriverId?: string;
    driverEmail?: string; // optional convenience
    from: string;
    to: string;
    stops?: string[];
    datetime: string; // ISO
    type?: RideType; // server can infer
    status?: RideStatus; // server defaults based on assignment
    notes?: string;
    coveredVisible?: boolean;

    fromLocation?: GeoPoint;
    toLocation?: GeoPoint;
    stopLocations?: GeoPoint[];
    fromPlaceId?: string;
    toPlaceId?: string;
    geocoder?: "mapbox" | "google" | "nominatim" | "pelias";
    geoAccuracy?: number;
    geocodedAt?: string;

    payment?: {
        method?: "cash" | "zelle" | "card" | "qr";
        paid?: boolean;
        driverPaid?: boolean;
        amountCents?: number;
    };
};

export type UpdateRideRequest = Partial<CreateRideRequest>;

export type RideListQuery = {
    status?: RideStatus;
    type?: RideType;
    driverId?: string;
    includeClaimed?: boolean;
    from?: string; // ISO
    to?: string;   // ISO
    page?: number;
    limit?: number;
    sort?: "asc" | "desc";
};

export type RidePage = {
    items: Ride[];
    page: number;
    limit: number;
    total: number;
    pages: number;
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

export const listRides = (params?: RideListQuery) =>
    apiGet<RidePage>(`/rides${q(params)}`);

export const getRide = (id: string) =>
    apiGet<Ride>(`/rides/${id}`);

export const createRide = (payload: CreateRideRequest) =>
    apiPost<Ride>("/rides", payload);

export const replaceRide = (id: string, payload: CreateRideRequest) =>
    apiPut<Ride>(`/rides/${id}`, payload);

export const updateRide = (id: string, payload: UpdateRideRequest) =>
    apiPatch<Ride>(`/rides/${id}`, payload);

export const deleteRide = (id: string) =>
    apiDelete<void>(`/rides/${id}`);

export const claimRide = (id: string, driverId: string) =>
    apiPost<{ ok: true; queuePosition: number }>(`/rides/${id}/claim`, { driverId });

export const assignRide = (id: string, driverId: string) =>
    apiPost<{ ok: true; ride: Ride }>(`/rides/${id}/assign`, { driverId });

export const setRideStatus = (id: string, status: RideStatus) =>
    apiPost<{ ok: true; ride: Ride }>(`/rides/${id}/status`, { status });

/* -------------------------------- Hooks ------------------------------- */
// Revalidate all rides-related caches
const revalidateRides = async () => {
    await globalMutate((key) => typeof key === "string" && key.startsWith("/rides"));
};

/* ---------------------------- Create (POST) ---------------------------- */
export function useCreateRide() {
    const m = useSWRMutation(
        "/rides",
        async (_key, { arg }: { arg: CreateRideRequest }) => createRide(arg),
        {
            onSuccess: () => revalidateRides(),
        }
    );
    return {
        createRide: m.trigger,
        isCreating: m.isMutating,
        created: m.data,
        createError: m.error as Error | undefined,
    };
}

/* ----------------------------- Replace (PUT) ---------------------------- */
export function useReplaceRide(id?: string) {
    const key = id ? `/rides/${id}` : null;
    const m = useSWRMutation(
        key,
        async (_key, { arg }: { arg: CreateRideRequest }) => replaceRide(id as string, arg),
        {
            onSuccess: async () => {
                await globalMutate(`/rides/${id}`);
                await revalidateRides();
            },
        }
    );
    return {
        replaceRide: m.trigger,
        isReplacing: m.isMutating,
        replaced: m.data,
        replaceError: m.error as Error | undefined,
    };
}

/* ------------------------------ Update (PATCH) ----------------------------- */
export function useUpdateRide(id?: string) {
    const key = id ? `/rides/${id}` : null;
    const m = useSWRMutation(
        key,
        async (_key, { arg }: { arg: UpdateRideRequest }) => updateRide(id as string, arg),
        {
            onSuccess: async () => {
                await globalMutate(`/rides/${id}`);
                await revalidateRides();
            },
        }
    );
    return {
        updateRide: m.trigger,
        isUpdating: m.isMutating,
        updated: m.data,
        updateError: m.error as Error | undefined,
    };
}

/* ------------------------------ Delete (DELETE) ----------------------------- */
export function useDeleteRide(id?: string) {
    const key = id ? `/rides/${id}` : null;
    const m = useSWRMutation(
        key,
        async () => {
            await deleteRide(id as string);
            return { ok: true as const };
        },
        {
            onSuccess: async () => {
                await globalMutate(`/rides/${id}`);
                await revalidateRides();
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

/* ------------------------------ Claim (POST) ------------------------------ */
export function useClaimRide(id?: string) {
    const key = id ? `/rides/${id}/claim` : null;
    const m = useSWRMutation(
        key,
        async (_key, { arg }: { arg: { driverId: string } }) => claimRide(id as string, arg.driverId),
        {
            onSuccess: async () => {
                await globalMutate(`/rides/${id}`);
                await revalidateRides();
            },
        }
    );
    return {
        claimRide: m.trigger, // call with { driverId }
        isClaiming: m.isMutating,
        claimResult: m.data,
        claimError: m.error as Error | undefined,
    };
}

/* ------------------------------ Assign (POST) ----------------------------- */
export function useAssignRide(id?: string) {
    const key = id ? `/rides/${id}/assign` : null;
    const m = useSWRMutation(
        key,
        async (_key, { arg }: { arg: { driverId: string } }) => assignRide(id as string, arg.driverId),
        {
            onSuccess: async () => {
                await globalMutate(`/rides/${id}`);
                await revalidateRides();
            },
        }
    );
    return {
        assignRide: m.trigger, // call with { driverId }
        isAssigning: m.isMutating,
        assignResult: m.data,
        assignError: m.error as Error | undefined,
    };
}

/* ---------------------------- Set Status (POST) --------------------------- */
export function useSetRideStatus(id?: string) {
    const key = id ? `/rides/${id}/status` : null;
    const m = useSWRMutation(
        key,
        async (_key, { arg }: { arg: { status: RideStatus } }) =>
            setRideStatus(id as string, arg.status),
        {
            onSuccess: async () => {
                await globalMutate(`/rides/${id}`);
                await revalidateRides();
            },
        }
    );
    return {
        setRideStatus: m.trigger, // call with { status }
        isSettingStatus: m.isMutating,
        statusResult: m.data,
        statusError: m.error as Error | undefined,
    };
}
export function useRides(params?: RideListQuery) {
    const key = `/rides${q(params)}`;
    return useSWR<RidePage>(key, () => listRides(params));
}

export function useRide(id?: string) {
    const key = id ? `/rides/${id}` : null;
    return useSWR<Ride>(key, () => getRide(id as string));
}

/** Infinite pagination helper: pass a stable base filter; controls page internally */
export function useRidesInfinite(base?: Omit<RideListQuery, "page" | "limit">, pageSize = 20) {
    const getKey = (index: number, prev: RidePage | null) => {
        if (prev && prev.items.length === 0) return null;
        const params: RideListQuery = { ...(base || {}), page: index + 1, limit: pageSize };
        return `/rides${q(params)}`;
    };
    const swr = useSWRInfinite<RidePage>(getKey, (key: string) => apiGet<RidePage>(key));
    const flat: Ride[] = (swr.data || []).flatMap((p) => p.items);
    const totalPages = swr.data?.[0]?.pages ?? 1;
    const reachedEnd = swr.size >= totalPages;
    return { ...swr, items: flat, reachedEnd, totalPages };
}
