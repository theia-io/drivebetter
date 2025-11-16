import {VehicleType} from "@/types/driver-details";
import {RideCreatorUser} from "@/types/user";
import {RideStatus} from "@/types/rideStatus";

export type RideType = "reservation" | "asap";
export type PaymentMethod = "cash" | "zelle" | "card" | "qr";

export type GeoPoint = {
    type: "Point";
    coordinates: [number, number]; // [lon, lat]
};

export type EligibleDriver = {
    userId: string;
    user?: { _id: string; name: string; email?: string; phone?: string; roles: string[] };
    vehicle?: { make?: string; model?: string; year?: number; color?: string; plate?: string; type?: VehicleType };
    capacity?: { seatsTotal?: number; maxPassengers?: number; luggageCapacityLiters?: number };
    features?: { petFriendly?: boolean; babySeat?: boolean; wheelchairAccessible?: boolean };
    languages?: { primary?: string; list?: string[] };
    preferences?: { airportPermit?: boolean; longDistance?: boolean };
    stats?: { ratingAvg?: number; ratingCount?: number; completedRides?: number };
};

export type EligibleDriverBody = {
    passengers?: number;
    luggages?: number;
    vehicleType?: VehicleType | "";
    language?: string;
    needs?: { pet?: boolean; babySeat?: boolean; wheelchair?: boolean };
    airportTrip?: boolean;
    longDistance?: boolean;
    limit?: number;
};

export type Ride = {
    _id: string;
    creatorId?: RideCreatorUser;
    customer?: {
        name: string;
        phone: string;
    } | null;
    from: string;
    to: string;
    stops?: string[];
    fromLocation?: GeoPoint;
    toLocation?: GeoPoint;
    stopLocations?: GeoPoint[];
    fromPlaceId?: string;
    toPlaceId?: string;
    geoAccuracy?: number;
    distance?: number;
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
    customer?: {
        name: string;
        phone: string;
    };
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