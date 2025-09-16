import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { RideStatus, RideType, PaymentMethod } from "../types/common";

export interface IRide extends Document {
    creatorId?: Types.ObjectId | null;
    clientId?: Types.ObjectId | null;
    from: string;
    to: string;
    stops?: string[];
    datetime: Date;
    type: RideType;
    queue: Types.ObjectId[];                // driver IDs in order
    assignedDriverId?: Types.ObjectId | null;
    coveredVisible: boolean;
    status: RideStatus;
    notes?: string;
    payment?: {
        method?: PaymentMethod;
        paid?: boolean;
        driverPaid?: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
}

const RideSchema = new Schema<IRide>(
    {
        creatorId:        { type: Schema.Types.ObjectId, ref: "User", default: null },
        clientId:         { type: Schema.Types.ObjectId, ref: "Client", default: null },
        from:             { type: String, required: true },
        to:               { type: String, required: true },
        stops:            [{ type: String }],
        datetime:         { type: Date, required: true },
        type:             { type: String, enum: ["reservation", "asap"], required: true },
        queue:            [{ type: Schema.Types.ObjectId, ref: "User" }],
        assignedDriverId: { type: Schema.Types.ObjectId, ref: "User", default: null },
        coveredVisible:   { type: Boolean, default: true },
        status: {
            type: String,
            enum: ["unassigned", "assigned", "on_my_way", "on_location", "pob", "clear"],
            default: "unassigned"
        },
        notes:   { type: String },
        payment: {
            method:    { type: String, enum: ["cash", "zelle", "card", "qr"] },
            paid:      { type: Boolean, default: false },
            driverPaid:{ type: Boolean, default: false }
        }
    },
    { timestamps: true }
);

const Ride: Model<IRide> =
    mongoose.models.Ride || mongoose.model<IRide>("Ride", RideSchema);

export default Ride;
