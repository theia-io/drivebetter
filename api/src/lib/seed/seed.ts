/* eslint-disable no-console */
import fs from "fs/promises";
import mongoose, { Types } from "mongoose";
import path from "path";

import { hashPassword } from "../crypto";
import { withDb } from "../db";

// MODELS
import DriverDetails from "../../models/driverDetails.model";
import {Group} from "../../models/group.model";
import Ride from "../../models/ride.model";
import { RideClaim } from "../../models/rideClaim.model";
import RideGroupShare from "../../models/rideGroupShare.model";
import { RideShare } from "../../models/rideShare.model";
import User from "../../models/user.model";

/**
 * Config types
 */
type OldConfig = {
    loadUsers?: boolean;
    loadGroups?: boolean;
    loadRides?: boolean;
    loadClients?: boolean; // ignored (removed)
    defaults: { password: string; roles: string[] };
    options: { clearBeforeInsert: boolean; logInserted: boolean };
};

type NewConfig = {
    toggles: {
        loadUsers: boolean;
        loadGroups: boolean;
        loadDriverDetails: boolean;
        loadRides: boolean;
        loadRideShares: boolean;
        loadRideGroupShares: boolean;
        loadRideClaims: boolean;
    };
    defaults: { password: string; roles: string[] };
    options: { clearBeforeInsert: boolean; logInserted: boolean };
};

type EffectiveConfig = {
    toggles: NewConfig["toggles"];
    defaults: NewConfig["defaults"];
    options: NewConfig["options"];
};

const DATA_DIR = path.join(__dirname, "data");

/**
 * Helpers
 */
const readJson = async <T = any>(file: string): Promise<T> => {
    const full = path.join(DATA_DIR, file);
    const raw = await fs.readFile(full, "utf-8");
    return JSON.parse(raw) as T;
};

const asObjectId = (v?: string | Types.ObjectId | null): Types.ObjectId | null => {
    if (!v) return null;
    if (v instanceof Types.ObjectId) return v;
    return new Types.ObjectId(v);
};

const ensureObjectId = (v?: string | Types.ObjectId | null): Types.ObjectId => {
    const id = asObjectId(v);
    if (!id) return new Types.ObjectId();
    return id;
};

const fixPoint = (p?: any) =>
    p && p.coordinates?.length === 2
        ? {
              type: "Point" as const,
              coordinates: [Number(p.coordinates[0]), Number(p.coordinates[1])] as [number, number],
          }
        : undefined;

const normalizeConfig = (raw: OldConfig | NewConfig): EffectiveConfig => {
    // New-style config with toggles
    if ((raw as NewConfig).toggles) {
        return raw as EffectiveConfig;
    }

    // Back-compat with old shape
    const old = raw as OldConfig;
    return {
        toggles: {
            loadUsers: !!old.loadUsers,
            loadGroups: !!old.loadGroups,
            loadDriverDetails: true, // not present in old config; default to true for convenience
            loadRides: !!old.loadRides,
            loadRideShares: true,
            loadRideGroupShares: true,
            loadRideClaims: true,
        },
        defaults: old.defaults,
        options: old.options,
    };
};

async function run() {
    const cfgPath = path.join(process.cwd(), "./config/seed.config.json");
    const rawCfg = JSON.parse(await fs.readFile(cfgPath, "utf-8")) as OldConfig | NewConfig;
    const config = normalizeConfig(rawCfg);

    await withDb(async () => {
        /**
         * Clear collections (reverse dependency order)
         */
        if (config.options.clearBeforeInsert) {
            await Promise.all([
                RideClaim.deleteMany({}),
                RideGroupShare.deleteMany({}),
                RideShare.deleteMany({}),
                Ride.deleteMany({}),
                DriverDetails.deleteMany({}),
                Group.deleteMany({}),
                User.deleteMany({}),
            ]);
            if (config.options.logInserted) console.log("🧹 Cleared collections");
        }

        /**
         * USERS
         */
        if (config.toggles.loadUsers) {
            const users = await readJson<any[]>("users.json");
            const prepared = await Promise.all(
                users.map(async (u) => ({
                    ...u,
                    passwordHash: u.passwordHash || (await hashPassword(config.defaults.password)),
                    roles:
                        Array.isArray(u.roles) && u.roles.length ? u.roles : config.defaults.roles,
                }))
            );
            const inserted = await User.insertMany(prepared, { ordered: false });
            if (config.options.logInserted) console.log(`👤 Inserted ${inserted.length} users`);
        }

        // Build lookups from DB (works even if users weren’t just inserted)
        const usersAll = (await User.find({}, { _id: 1, email: 1 })).map((d) =>
            d.toObject()
        ) as Array<{ _id: Types.ObjectId; email: string }>;
        const usersByEmail = new Map(usersAll.map((u) => [u.email.toLowerCase(), u]));
        const usersById = new Map(usersAll.map((u) => [u._id.toString(), u]));

        /**
         * GROUPS
         * Supports "membersEmails" or raw "members" ObjectIds
         */
        if (config.toggles.loadGroups) {
            const groups = await readJson<any[]>("groups.json");
            const prepared = groups.map((g) => {
                let members: Types.ObjectId[] = [];

                if (Array.isArray(g.membersEmails)) {
                    members = g.membersEmails
                        .map((e: string) => usersByEmail.get(String(e).toLowerCase())?._id)
                        .filter(Boolean) as Types.ObjectId[];
                } else if (Array.isArray(g.members)) {
                    members = g.members.map((id: string) => ensureObjectId(id));
                }

                return { ...g, members };
            });

            const inserted = await Group.insertMany(prepared, { ordered: false });
            if (config.options.logInserted) console.log(`👥 Inserted ${inserted.length} groups`);
        }

        const groupsAll = await Group.find({}, { _id: 1, name: 1 });
        const groupsByName = new Map(groupsAll.map((g) => [g.name, g]));
        const groupsById = (await Group.find({}, { _id: 1, name: 1 })).map((d) =>
            d.toObject()
        ) as Array<{ _id: Types.ObjectId; name: string }>;

        /**
         * DRIVER DETAILS
         * Supports "userEmail" or "userId"
         */
        if (config.toggles.loadDriverDetails) {
            const details = await readJson<any[]>("driverDetails.json");
            const prepared = details.map((d) => {
                const userId = d.userId
                    ? ensureObjectId(d.userId)
                    : usersByEmail.get(String(d.userEmail).toLowerCase())?._id;

                if (!userId) {
                    throw new Error(
                        `DriverDetails: could not resolve user for ${d.userEmail || d.userId}`
                    );
                }

                return {
                    ...d,
                    userId,
                    service: d.service
                        ? {
                              ...d.service,
                              homeCoordinates: d.service.homeCoordinates
                                  ? (fixPoint(d.service.homeCoordinates) ?? null)
                                  : null,
                          }
                        : undefined,
                };
            });

            const inserted = await DriverDetails.insertMany(prepared, {
                ordered: false,
            });
            if (config.options.logInserted)
                console.log(`🚕 Inserted ${inserted.length} driver details`);
        }

        /**
         * RIDES
         * Supports "assignedDriverEmail", "queueDriverEmails", GeoJSON points
         * Also allows optional "ref" field for human-friendly linking by subsequent seeds
         */
        if (config.toggles.loadRides) {
            const rides = await readJson<any[]>("rides.json");

            const prepared = rides.map((r) => {
                const assignedDriverId = r.assignedDriverId
                    ? asObjectId(r.assignedDriverId)
                    : r.assignedDriverEmail
                      ? usersByEmail.get(String(r.assignedDriverEmail).toLowerCase())?._id || null
                      : null;

                const queue: Types.ObjectId[] = Array.isArray(r.queueDriverEmails)
                    ? (r.queueDriverEmails
                          .map((e: string) => usersByEmail.get(String(e).toLowerCase())?._id)
                          .filter(Boolean) as Types.ObjectId[])
                    : Array.isArray(r.queue)
                      ? r.queue.map((id: string) => ensureObjectId(id))
                      : [];

                return {
                    ...r,
                    assignedDriverId: assignedDriverId ?? null,
                    queue,
                    fromLocation: fixPoint(r.fromLocation),
                    toLocation: fixPoint(r.toLocation),
                    stopLocations: Array.isArray(r.stopLocations)
                        ? r.stopLocations.map(fixPoint).filter(Boolean)
                        : undefined,
                };
            });

            const inserted = await Ride.insertMany(prepared, { ordered: false });
            if (config.options.logInserted) console.log(`🚗 Inserted ${inserted.length} rides`);
        }

        // Ride lookups (including optional "ref")
        const ridesAll = await Ride.find({}, { _id: 1, ref: 1 });
        const ridesById = new Map(ridesAll.map((r: any) => [r._id.toString(), r]));
        const ridesByRef = new Map(
            ridesAll.filter((r: any) => r.ref).map((r: any) => [String(r.ref), r])
        );
    });

    await mongoose.connection.close();
    console.log("✅ Seeding complete");
}

run().catch((err) => {
    console.error("❌ Seeding failed", err);
    // try to close connection if open
    if (mongoose.connection?.readyState === 1) {
        mongoose.connection.close().catch(() => {});
    }
    process.exit(1);
});
