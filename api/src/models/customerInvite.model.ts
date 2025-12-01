import mongoose, { Schema, Types, Model, Document } from "mongoose";

export type CustomerInviteStatus = "pending" | "used" | "expired";

export interface ICustomerInvite extends Document {
    email: string;
    invitedBy: Types.ObjectId; // User who invited (dispatcher/admin)
    code: string; // invitation code used in registration flow
    message?: string;
    expiresAt?: Date | null;
    usedBy?: Types.ObjectId | null; // created customer userId
    usedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const CustomerInviteSchema = new Schema<ICustomerInvite>(
    {
        email: { type: String, required: true, index: true, lowercase: true, trim: true },
        invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        code: { type: String, required: true, unique: true, index: true },
        message: { type: String, trim: true },
        expiresAt: { type: Date, default: null },
        usedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        usedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

// Optional compound index to avoid duplicates for same inviter/email while pending
CustomerInviteSchema.index(
    { email: 1, invitedBy: 1, usedBy: 1 },
    { partialFilterExpression: { usedBy: null } }
);

export const CustomerInvite: Model<ICustomerInvite> =
    mongoose.models.CustomerInvite ||
    mongoose.model<ICustomerInvite>("CustomerInvite", CustomerInviteSchema);
