// models/rideGroupShare.model.ts
import mongoose, { Schema, Types, Model, Document } from "mongoose";

export interface IRideGroupShare extends Document {
    rideId: Types.ObjectId; // ref Ride
    groupId: Types.ObjectId; // ref Group
    exclusive?: boolean; // if true, hide from others until window ends
    priority?: number; // higher = earlier in queue/visibility
    window?: { startsAt?: Date; endsAt?: Date };
    createdAt: Date;
    updatedAt: Date;
}

const WindowSchema = new Schema({ startsAt: Date, endsAt: Date }, { _id: false });

const RideGroupShareSchema = new Schema<IRideGroupShare>(
    {
        rideId: { type: Schema.Types.ObjectId, ref: "Ride", required: true, index: true },
        groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
        exclusive: { type: Boolean, default: false },
        priority: { type: Number, default: 0 },
        window: { type: WindowSchema },
    },
    { timestamps: true }
);

// Uniqueness per ride/group
RideGroupShareSchema.index({ rideId: 1, groupId: 1 }, { unique: true });
// Time-window queries
RideGroupShareSchema.index({ "window.startsAt": 1 });
RideGroupShareSchema.index({ "window.endsAt": 1 });

export default (mongoose.models.RideGroupShare as Model<IRideGroupShare>) ||
    mongoose.model<IRideGroupShare>("RideGroupShare", RideGroupShareSchema);
