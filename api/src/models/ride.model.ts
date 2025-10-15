import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { RideStatus, RideType, PaymentMethod } from "../types/common";

// GeoJSON Point type
type GeoPoint = {
    type: "Point";
    coordinates: [number, number]; // [lon, lat]
};

export interface IRide extends Document {
    creatorId?: Types.ObjectId | null;
    customer?: {
        name: string;
        phone?: string;
    };

    // Display strings
    from: string;
    to: string;
    stops?: string[];

    // Geo-normalized
    fromLocation?: GeoPoint;
    toLocation?: GeoPoint;
    stopLocations?: GeoPoint[];

    // Optional provider metadata
    fromPlaceId?: string;
    toPlaceId?: string;
    distance: number;
    geoAccuracy?: number;
    geocodedAt?: Date;

    datetime: Date;
    type: RideType; // expect "reservation" | "asap"
    queue: Types.ObjectId[]; // driver IDs in order
    assignedDriverId?: Types.ObjectId | null;
    coveredVisible: boolean;
    status: RideStatus;
    notes?: string;

    // Payments
    payment?: {
        method?: PaymentMethod;
        paid?: boolean;
        driverPaid?: boolean;
        amountCents?: number;
    };

    createdAt: Date;
    updatedAt: Date;
}

// Reusable GeoJSON Point schema
const PointSchema = new Schema<GeoPoint>(
    {
        type: { type: String, enum: ["Point"], required: true, default: "Point" },
        coordinates: {
            type: [Number],
            required: true,
            validate: {
                validator: (v: number[]) =>
                    Array.isArray(v) &&
                    v.length === 2 &&
                    v[0] >= -180 &&
                    v[0] <= 180 &&
                    v[1] >= -90 &&
                    v[1] <= 90,
                message: "coordinates must be [lon, lat] within valid ranges",
            },
        },
    },
    { _id: false }
);

const RideSchema = new Schema<IRide>(
    {
        creatorId:        { type: Schema.Types.ObjectId, ref: "User", default: null },
        customer: {
            name:  { type: String, trim: true, required: false },
            phone: { type: String, trim: true, required: false },
        },

        // Display strings
        from:             { type: String, required: true },
        to:               { type: String, required: true },
        stops:            [{ type: String }],

        // Geo-normalized
        fromLocation:     { type: PointSchema, index: "2dsphere", required: false },
        toLocation:       { type: PointSchema, index: "2dsphere", required: false },
        stopLocations:    { type: [PointSchema], required: false },

        // Provider metadata
        fromPlaceId:      { type: String },
        toPlaceId:        { type: String },
        distance:         { type: Number, min: 0 },
        geoAccuracy:      { type: Number, min: 0 },
        geocodedAt:       { type: Date },

        datetime:         { type: Date, required: true },

        // Correct type enum: completion is a status, not a type
        type:             { type: String, enum: ["reservation", "asap"], required: true },

        queue:            [{ type: Schema.Types.ObjectId, ref: "User" }],
        assignedDriverId: { type: Schema.Types.ObjectId, ref: "User", default: null },

        coveredVisible:   { type: Boolean, default: true },

        status: {
            type: String,
            enum: ["unassigned", "assigned", "on_my_way", "on_location", "pob", "clear", "completed"],
            default: "unassigned",
        },

        notes: { type: String },

        payment: {
            method:     { type: String, enum: ["cash", "card", "qr"] },
            paid:       { type: Boolean, default: false },
            driverPaid: { type: Boolean, default: false },
            amountCents:{ type: Number, min: 0 },
        },
    },
    { timestamps: true }
);

// Operational indexes
RideSchema.index({ status: 1, datetime: 1 });
RideSchema.index({ assignedDriverId: 1, datetime: -1 });
RideSchema.index({ type: 1, datetime: 1 });

const Ride: Model<IRide> =
    mongoose.models.Ride || mongoose.model<IRide>("Ride", RideSchema);

export default Ride;
