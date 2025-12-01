import mongoose, { Schema, Types, Document, Model } from "mongoose";

export interface ICustomerProfile extends Document {
    userId: Types.ObjectId;       // ref User with role=client
    invitedBy: Types.ObjectId;    // ref User (admin/dispatcher)
    age?: number;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const CustomerProfileSchema = new Schema<ICustomerProfile>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true,
        },
        invitedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        age: {
            type: Number,
            min: 0,
            max: 120,
        },
        notes: {
            type: String,
            trim: true,
        },
    },
    { timestamps: true }
);

CustomerProfileSchema.index({ invitedBy: 1, createdAt: -1 });

const CustomerProfile: Model<ICustomerProfile> =
    (mongoose.models.CustomerProfile as Model<ICustomerProfile>) ||
    mongoose.model<ICustomerProfile>("CustomerProfile", CustomerProfileSchema);

export default CustomerProfile;
