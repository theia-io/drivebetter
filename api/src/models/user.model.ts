import mongoose, { Schema, Document, Model } from "mongoose";
import { Role } from "../types/common";

export interface IUser extends Document {
    name: string;
    email: string;
    phone?: string;
    passwordHash?: string;
    roles: Role[];
    referralCode?: string;

    emailVerified: boolean;
    emailVerifyToken?: string | null;
    emailVerifyExpires?: Date | null;

    otpCode?: string | null;
    otpExpires?: Date | null;

    resetToken?: string | null;
    resetExpires?: Date | null;

    refreshTokens?: string[]; // optional token allow-list

    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true, index: true },
        phone: { type: String },

        passwordHash: { type: String },

        roles: {
            type: [String],
            enum: ["driver", "dispatcher", "client", "admin"],
            default: ["driver"],
        },
        referralCode: { type: String },

        emailVerified: { type: Boolean, default: false },
        emailVerifyToken: { type: String, default: null },
        emailVerifyExpires: { type: Date, default: null },

        otpCode: { type: String, default: null },
        otpExpires: { type: Date, default: null },

        resetToken: { type: String, default: null },
        resetExpires: { type: Date, default: null },

        refreshTokens: { type: [String], default: [] }
    },
    { timestamps: true }
);

const User: Model<IUser> =
    mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
