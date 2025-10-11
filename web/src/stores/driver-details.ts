// web/ui/src/services/driver-details.ts
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { apiGet, apiPost, apiPatch, apiPut, apiDelete } from "@/services/http";

/* ------------------------------- Types ------------------------------- */

export type VehicleType = "sedan" | "suv" | "van" | "wagon" | "hatchback" | "pickup" | "other";

export type DriverDocument = {
    _id?: string;
    type: "license" | "insurance" | "registration" | "permit" | "other";
    url: string;
    uploadedAt?: string;
    expiresAt?: string | null;
    note?: string;
};

export type DriverDetails = {
    _id: string;
    userId: string;

    vehicle?: {
        make?: string;
        model?: string;
        year?: number;
        color?: string;
        plate?: string;
        type?: VehicleType;
        vin?: string;
        registrationExpiry?: string | null;
        insurancePolicyNumber?: string;
        insuranceExpiry?: string | null;
    };

    capacity?: {
        seatsTotal?: number;
        maxPassengers?: number;
        luggageCapacityLiters?: number;
    };

    features?: {
        petFriendly?: boolean;
        babySeat?: boolean;
        boosterSeat?: boolean;
        wheelchairAccessible?: boolean;
        smokingAllowed?: boolean;
    };

    equipment?: {
        chargerTypes?: Array<"usb-a" | "usb-c" | "magsafe" | "lighter">;
        skiRack?: boolean;
        bikeRack?: boolean;
        trunkLarge?: boolean;
        climateControlZones?: number;
    };

    preferences?: {
        airportPermit?: boolean;
        nightShifts?: boolean;
        longDistance?: boolean;
        corporateOnly?: boolean;
    };

    languages?: {
        primary?: string;
        list?: string[];
    };

    service?: {
        homeCity?: string;
        homeCoordinates?: { type: "Point"; coordinates: [number, number] } | null;
        serviceRadiusKm?: number;
        serviceAreas?: string[];
    };

    availability?: {
        workingDays?: Array<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun">;
        shiftStart?: string | null;
        shiftEnd?: string | null;
        breaks?: Array<{ start: string; end: string }>;
    };

    pricing?: {
        baseFareCents?: number;
        perKmCents?: number;
        perMinuteCents?: number;
        surgeEligible?: boolean;
    };

    compliance?: {
        licenseNumber?: string;
        licenseExpiry?: string | null;
        backgroundCheckCleared?: boolean;
        backgroundCheckedAt?: string | null;
    };

    documents?: DriverDocument[];

    stats?: {
        ratingAvg?: number;
        ratingCount?: number;
        completedRides?: number;
        cancellations?: number;
        lastActiveAt?: string | null;
    };

    notes?: string;
    tags?: string[];

    createdAt: string;
    updatedAt: string;
};

export type CreateDriverDetailsRequest = Omit<DriverDetails, "_id" | "createdAt" | "updatedAt" | "stats">;
export type UpdateDriverDetailsRequest = Partial<CreateDriverDetailsRequest>;

export type DriverDetailsQuery = {
    vehicleType?: VehicleType;
    seatsMin?: number;
    petFriendly?: boolean;
    babySeat?: boolean;
    wheelchairAccessible?: boolean;
    language?: string; // ISO 639-1
    city?: string;
    day?: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
    q?: string;
    sort?: "recent" | "rating" | "seats";
    page?: number;
    limit?: number;
};

export type DriverDetailsPage = {
    items: DriverDetails[];
    page: number;
    limit: number;
    total: number;
    pages: number;
};

export type NearQuery = {
    lon: number;
    lat: number;
    radiusKm?: number;
    vehicleType?: VehicleType;
    seatsMin?: number;
    limit?: number;
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

export const listDriverDetails = (params?: DriverDetailsQuery) =>
    apiGet<DriverDetailsPage>(`/driver-details${q(params)}`);

export const getDriverDetails = (id: string) =>
    apiGet<DriverDetails>(`/driver-details/${id}`);

export const getDriverDetailsByUser = (userId: string) =>
    apiGet<DriverDetails>(`/driver-details/by-user/${userId}`);

export const createDriverDetails = (payload: CreateDriverDetailsRequest) =>
    apiPost<DriverDetails>("/driver-details", payload);

export const replaceDriverDetails = (id: string, payload: CreateDriverDetailsRequest) =>
    apiPut<DriverDetails>(`/driver-details/${id}`, payload);

export const updateDriverDetails = (id: string, payload: UpdateDriverDetailsRequest) =>
    apiPatch<DriverDetails>(`/driver-details/${id}`, payload);

export const deleteDriverDetails = (id: string) =>
    apiDelete<void>(`/driver-details/${id}`);

export const findDriversNear = (params: NearQuery) =>
    apiGet<{ items: DriverDetails[] }>(`/driver-details/near${q(params)}`);

export const addDriverDocument = (id: string, doc: Omit<DriverDocument, "_id" | "uploadedAt">) =>
    apiPost<DriverDetails>(`/driver-details/${id}/documents`, doc);

export const removeDriverDocument = (id: string, docId: string) =>
    apiDelete<DriverDetails>(`/driver-details/${id}/documents/${docId}`);

export const driverDetailsStats = () =>
    apiGet<{
        total: number;
        byVehicle: Array<{ _id: VehicleType | null; n: number }>;
        wheelchair: number;
        petFriendly: number;
        avgRating: number | null;
        ratedDrivers: number;
    }>(`/driver-details/aggregate/stats`);

/* -------------------------------- Hooks ------------------------------- */

export function useDriverDetailsList(params?: DriverDetailsQuery) {
    const key = `/driver-details${q(params)}`;
    return useSWR<DriverDetailsPage>(key, () => listDriverDetails(params));
}

export function useDriverDetails(id?: string) {
    const key = id ? `/driver-details/${id}` : null;
    return useSWR<DriverDetails>(key, () => getDriverDetails(id as string));
}

export function useDriverDetailsByUser(userId?: string) {
    const key = userId ? `/driver-details/by-user/${userId}` : null;
    return useSWR<DriverDetails>(key, () => getDriverDetailsByUser(userId as string));
}

export function useDriverDetailsInfinite(base?: Omit<DriverDetailsQuery, "page" | "limit">, pageSize = 20) {
    const getKey = (index: number, prev: DriverDetailsPage | null) => {
        if (prev && prev.items.length === 0) return null;
        const params: DriverDetailsQuery = { ...(base || {}), page: index + 1, limit: pageSize };
        return `/driver-details${q(params)}`;
    };
    const swr = useSWRInfinite<DriverDetailsPage>(getKey, (key: string) => apiGet<DriverDetailsPage>(key));
    const flat: DriverDetails[] = (swr.data || []).flatMap((p) => p.items);
    const totalPages = swr.data?.[0]?.pages ?? 1;
    const reachedEnd = swr.size >= totalPages;
    return { ...swr, items: flat, reachedEnd, totalPages };
}
