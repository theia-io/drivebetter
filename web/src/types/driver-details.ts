export type VehicleType = "sedan" | "suv" | "van" | "wagon" | "hatchback" | "pickup" | "other";

export type DriverDocument = {
    _id?: string;
    type: "license" | "insurance" | "registration" | "permit" | "other";
    url: string;
    uploadedAt?: string;
    expiresAt?: string | null;
    note?: string;
};

