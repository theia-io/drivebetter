// src/utils/rideAuthz.ts
import mongoose from "mongoose";

export function isPrivileged(user: any): boolean {
    const roles: string[] = Array.isArray(user?.roles) ? user.roles : [];
    return roles.includes("admin") || roles.includes("dispatcher");
}

/**
 * Returns an object you can spread into your existing Mongo filter.
 * - For admin/dispatcher: {}
 * - For driver: { creatorId: user.id }   // (or see variant below)
 */
export function rideScopeFilter(user: any) {
    if (!user) return { _id: { $exists: false } }; // deny if somehow no user
    if (isPrivileged(user)) return {};
    return {
      $or: [
        { creatorId: new mongoose.Types.ObjectId(user.id) },
        { assignedDriverId: new mongoose.Types.ObjectId(user.id) },
      ],
    };
}

/**
 * For single-ride endpoints (GET/PATCH/DELETE).
 * Throw 403 if a driver tries to access a ride they didn’t create.
 */
export function assertCanAccessRide(user: any, ride: any) {
    if (!user) {
        const err: any = new Error("Forbidden");
        err.status = 403;
        throw err;
    }
    if (isPrivileged(user)) return;
    const same = String(ride.creatorId) === String(user.id);
    if (!same) {
        const err: any = new Error("Forbidden");
        err.status = 403;
        throw err;
    }
}
