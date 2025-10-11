// src/models/driverDetails.model.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type Weekday =
    | "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface IDriverDetails extends Document {
    userId: Types.ObjectId;

    vehicle?: {
        make?: string;
        model?: string;
        year?: number;
        color?: string;
        plate?: string;
        type?: "sedan" | "suv" | "van" | "wagon" | "hatchback" | "pickup" | "other";
        vin?: string;
        registrationExpiry?: Date | null;
        insurancePolicyNumber?: string;
        insuranceExpiry?: Date | null;
    };

    capacity?: {
        seatsTotal?: number;                 // installed seatbelts incl. driver
        maxPassengers?: number;             // passengers allowed for rides
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
        primary?: string;                    // ISO 639-1 (e.g., "en")
        list?: string[];                     // additional ISO 639-1 codes
    };

    service?: {
        homeCity?: string;
        homeCoordinates?: { type: "Point"; coordinates: [number, number] } | null; // [lon, lat]
        serviceRadiusKm?: number;
        serviceAreas?: string[];
    };

    availability?: {
        workingDays?: Weekday[];
        shiftStart?: string | null;         // "HH:mm"
        shiftEnd?: string | null;           // "HH:mm"
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
        licenseExpiry?: Date | null;
        backgroundCheckCleared?: boolean;
        backgroundCheckedAt?: Date | null;
    };

    documents?: Array<{
        type: "license" | "insurance" | "registration" | "permit" | "other";
        url: string;
        uploadedAt?: Date;
        expiresAt?: Date | null;
        note?: string;
    }>;

    // denormalized ops
    stats?: {
        ratingAvg?: number;                  // 1..5
        ratingCount?: number;
        completedRides?: number;
        cancellations?: number;
        lastActiveAt?: Date | null;
    };

    notes?: string;
    tags?: string[];

    createdAt: Date;
    updatedAt: Date;
}

const PointSchema = new Schema(
    {
        type: { type: String, enum: ["Point"], required: true },
        coordinates: {
            type: [Number],
            required: true,                    // [lon, lat]
            validate: {
                validator: (v: number[]) => Array.isArray(v) && v.length === 2,
                message: "Point.coordinates must be [lon, lat]",
            },
        },
    },
    { _id: false }
);

const DriverDetailsSchema = new Schema<IDriverDetails>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true, unique: true },

        vehicle: {
            make: String,
            model: String,
            year: { type: Number, min: 1970, max: 2100 },
            color: String,
            plate: { type: String, index: true, sparse: true },
            type: { type: String, enum: ["sedan", "suv", "van", "wagon", "hatchback", "pickup", "other"], default: "sedan" },
            vin: { type: String, index: true, sparse: true },
            registrationExpiry: { type: Date, default: null },
            insurancePolicyNumber: String,
            insuranceExpiry: { type: Date, default: null },
        },

        capacity: {
            seatsTotal: { type: Number, min: 1, max: 9, default: 4 },
            maxPassengers: { type: Number, min: 1, max: 8, default: 3 },
            luggageCapacityLiters: { type: Number, min: 0 },
        },

        features: {
            petFriendly: { type: Boolean, default: false },
            babySeat: { type: Boolean, default: false },
            boosterSeat: { type: Boolean, default: false },
            wheelchairAccessible: { type: Boolean, default: false },
            smokingAllowed: { type: Boolean, default: false },
        },

        equipment: {
            chargerTypes: [{ type: String, enum: ["usb-a", "usb-c", "magsafe", "lighter"] }],
            skiRack: { type: Boolean, default: false },
            bikeRack: { type: Boolean, default: false },
            trunkLarge: { type: Boolean, default: false },
            climateControlZones: { type: Number, min: 0, max: 4 },
        },

        preferences: {
            airportPermit: { type: Boolean, default: false },
            nightShifts: { type: Boolean, default: false },
            longDistance: { type: Boolean, default: true },
            corporateOnly: { type: Boolean, default: false },
        },

        languages: {
            primary: { type: String, trim: true },
            list: [{ type: String, trim: true }],
        },

        service: {
            homeCity: { type: String, trim: true },
            homeCoordinates: { type: PointSchema, default: null },
            serviceRadiusKm: { type: Number, min: 0, default: 50 },
            serviceAreas: [{ type: String, trim: true }],
        },

        availability: {
            workingDays: [{ type: String, enum: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] }],
            shiftStart: { type: String, default: null }, // "HH:mm"
            shiftEnd: { type: String, default: null },   // "HH:mm"
            breaks: [{ start: String, end: String }],
        },

        pricing: {
            baseFareCents: { type: Number, min: 0 },
            perKmCents: { type: Number, min: 0 },
            perMinuteCents: { type: Number, min: 0 },
            surgeEligible: { type: Boolean, default: true },
        },

        compliance: {
            licenseNumber: { type: String, trim: true },
            licenseExpiry: { type: Date, default: null },
            backgroundCheckCleared: { type: Boolean, default: false },
            backgroundCheckedAt: { type: Date, default: null },
        },

        documents: [
            {
                type: {
                    type: String,
                    enum: ["license", "insurance", "registration", "permit", "other"],
                    required: true,
                },
                url: { type: String, required: true },
                uploadedAt: { type: Date, default: Date.now },
                expiresAt: { type: Date, default: null },
                note: { type: String, trim: true },
            },
        ],

        stats: {
            ratingAvg: { type: Number, min: 0, max: 5, default: 0 },
            ratingCount: { type: Number, min: 0, default: 0 },
            completedRides: { type: Number, min: 0, default: 0 },
            cancellations: { type: Number, min: 0, default: 0 },
            lastActiveAt: { type: Date, default: null },
        },

        notes: { type: String, trim: true },
        tags: [{ type: String, trim: true }],
    },
    { timestamps: true }
);

// Indexes
DriverDetailsSchema.index({ "service.homeCoordinates": "2dsphere" });
DriverDetailsSchema.index({ "vehicle.plate": 1 }, { sparse: true });
DriverDetailsSchema.index({ "vehicle.vin": 1 }, { sparse: true });

const DriverDetails: Model<IDriverDetails> =
    mongoose.models.DriverDetails || mongoose.model<IDriverDetails>("DriverDetails", DriverDetailsSchema);

export default DriverDetails;
