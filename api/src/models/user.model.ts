import mongoose, { Document, Model, Schema } from "mongoose";
import { PushSubscription } from "web-push";
import { Role } from "../types/common";

// TODO @todo move to a separate file and re-use on FE & BE
export interface DeviceInfo {
    deviceType?: "mobile" | "desktop" | "tablet" | "unknown";
    browser?: {
        name: string;
        version: string;
        vendor?: string;
    };
    os?: {
        name: string;
        version?: string;
    };
    display?: {
        width: number;
        height: number;
        pixelRatio: number;
    };
    userAgent?: string;
    locale?: string;
    timezone?: string;
    timezoneOffset?: number;
    isPWA?: boolean;
    isStandalone?: boolean;
    connectionType?: "cellular" | "wifi" | "ethernet" | "unknown";
    effectiveType?: "2g" | "3g" | "4g" | "slow-2g" | "unknown";
    notificationPermission?: "default" | "granted" | "denied" | "unsupported";
    collectedAt?: string;
}

// TODO @todo move to a separate file and re-use on FE & BE
export interface Subscription extends PushSubscription {
    deviceName: string;
    subscribedAt: Date;
    deviceInfo?: DeviceInfo; // Optional: privacy-compliant device information
}

export interface IUser extends Document {
    name: string;
    email: string;
    phone?: string;
    passwordHash?: string;
    roles: Role[];
    referralCode?: string;
    subscriptions?: Subscription[];
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
            enum: ["driver", "dispatcher", "customer", "admin"],
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

        refreshTokens: { type: [String], default: [] },

        subscriptions: {
            type: [
                {
                    deviceName: { type: String, required: true },
                    subscribedAt: { type: Date, required: true },
                    endpoint: { type: String, required: true },
                    expirationTime: { type: Number, default: null },
                    keys: {
                        p256dh: { type: String, required: true },
                        auth: { type: String, required: true },
                    },
                    // Optional device info (privacy-compliant)
                    deviceInfo: {
                        type: {
                            deviceType: {
                                type: String,
                                enum: ["mobile", "desktop", "tablet", "unknown"],
                            },
                            browser: {
                                type: {
                                    name: String,
                                    version: String,
                                    vendor: String,
                                },
                                _id: false,
                            },
                            os: {
                                type: {
                                    name: String,
                                    version: String,
                                },
                                _id: false,
                            },
                            display: {
                                type: {
                                    width: Number,
                                    height: Number,
                                    pixelRatio: Number,
                                },
                                _id: false,
                            },
                            userAgent: String,
                            locale: String,
                            timezone: String,
                            timezoneOffset: Number,
                            isPWA: Boolean,
                            isStandalone: Boolean,
                            // connectionType: {
                            //     type: String,
                            //     enum: ["cellular", "wifi", "ethernet", "unknown"],
                            // },
                            connectionType: String,
                            effectiveType: String,
                            notificationPermission: String,
                            // effectiveType: {
                            //     type: String,
                            //     enum: ["2g", "3g", "4g", "slow-2g", "unknown"],
                            // },
                            // notificationPermission: {
                            //     type: String,
                            //     enum: ["default", "granted", "denied", "unsupported"],
                            // },
                            collectedAt: String,
                        },
                        required: false,
                        _id: false,
                    },
                },
            ],
            default: [],
        },
    },
    { timestamps: true }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
