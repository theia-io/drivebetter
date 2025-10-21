import mongoose, {Model, Schema, Types} from "mongoose";
import { customAlphabet } from "nanoid";

export type RideVisibility = "public" | "groups" | "drivers";

export interface IRideShare extends Document {
    rideId: Types.ObjectId;
    visibility: RideVisibility;
    groupIds?: Types.ObjectId[];
    driverIds?: Types.ObjectId[];
    expiresAt?: Date | null;
    maxClaims?: number | null;
    claimsCount: number;
    syncQueue: boolean;
    status: "active" | "revoked" | "expired" | "closed";
    revokedAt?: Date | null;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export function hasRideExpired(s: IRideShare) {
    return !!s.expiresAt && new Date(s.expiresAt).getTime() <= Date.now();
}

export const RideShareSchema = new Schema<IRideShare>(
    {
        rideId:     { type: Schema.Types.ObjectId, ref: "Ride", required: true, index: true },
        visibility: { type: String, enum: ["public", "groups", "drivers"], required: true },
        groupIds:   [{ type: Schema.Types.ObjectId, ref: "Group" }],
        driverIds:  [{ type: Schema.Types.ObjectId, ref: "User" }],
        expiresAt:  { type: Date, default: null },
        maxClaims:  { type: Number, min: 1, default: null },
        claimsCount:{ type: Number, default: 0 },
        syncQueue:  { type: Boolean, default: true },
        status:     { type: String, enum: ["active", "revoked", "expired", "closed"], default: "active", index: true },
        revokedAt:  { type: Date, default: null },
        createdBy:  { type: Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: true }
);

RideShareSchema.index({ rideId: 1, status: 1 });

// maintain revokedAt
RideShareSchema.pre("save", function (next) {
    if (this.isModified("status")) {
        if (this.status === "revoked" && !this.revokedAt) this.revokedAt = new Date();
        if (this.status !== "revoked") this.revokedAt = null;
    }
    next();
});

export const RideShare: Model<IRideShare> =
    mongoose.models.RideShare || mongoose.model<IRideShare>("RideShare", RideShareSchema);

