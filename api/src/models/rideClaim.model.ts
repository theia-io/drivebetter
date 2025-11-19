import mongoose, { Schema, Types, Model } from "mongoose";

export type RideClaimStatus = "queued" | "approved" | "rejected" | "withdrawn";

export interface IRideClaim {
    rideId: Types.ObjectId;
    shareId: Types.ObjectId | null; // the share that produced this claim (nullable)
    driverId: Types.ObjectId;
    status: RideClaimStatus;
    createdAt: Date;
    updatedAt: Date;
}

const RideClaimSchema = new Schema<IRideClaim>(
    {
        rideId: { type: Schema.Types.ObjectId, ref: "Ride", required: true, index: true },
        shareId: { type: Schema.Types.ObjectId, ref: "RideShare", default: null },
        driverId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        status: {
            type: String,
            enum: ["queued", "approved", "rejected", "withdrawn"],
            default: "queued",
            index: true,
        },
    },
    { timestamps: true }
);

RideClaimSchema.index(
    { rideId: 1, driverId: 1, status: 1 },
    { unique: true, partialFilterExpression: { status: "queued" } }
);

export const RideClaim: Model<IRideClaim> =
    mongoose.models.RideClaim || mongoose.model<IRideClaim>("RideClaim", RideClaimSchema);
