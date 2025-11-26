export type Role = "driver" | "dispatcher" | "client" | "admin";

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
    subscribedAt: string;
    deviceInfo?: DeviceInfo; // Optional: privacy-compliant device information
}

export interface User {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    roles: Role[];
    emailVerified?: boolean;
    createdAt?: string;
    updatedAt?: string;
    subscriptions?: Subscription[];
}

export interface RideCreatorUser {
    _id: string;
    name: string;
    email: string;
    phone?: string;
}
