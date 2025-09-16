import { withDb } from "../db";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { hashPassword } from "../crypto";

import User from "../../models/user.model";
import Group from "../../models/group.model";
import Ride from "../../models/ride.model";
import Client from "../../models/client.model";

interface SeedConfig {
    loadUsers: boolean;
    loadGroups: boolean;
    loadRides: boolean;
    loadClients: boolean;
    defaults: {
        password: string;
        roles: string[];
    };
    options: {
        clearBeforeInsert: boolean;
        logInserted: boolean;
    };
}

async function loadJSON<T>(filename: string): Promise<T> {
    const filePath = path.join(__dirname, "data", filename);
    const raw = await fs.promises.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
}

async function run() {
    const configPath = path.join(process.cwd(), "./config/seed.config.json");
    const config: SeedConfig = JSON.parse(
        await fs.promises.readFile(configPath, "utf-8")
    );

    await withDb(async () => {
        if (config.loadUsers) {
            if (config.options.clearBeforeInsert) await User.deleteMany({});
            const users = await loadJSON<any[]>("users.json");

            const prepared = await Promise.all(
                users.map(async (u) => ({
                    ...u,
                    passwordHash: await hashPassword(config.defaults.password),
                    roles: u.roles || config.defaults.roles,
                }))
            );

            const inserted = await User.insertMany(prepared);
            if (config.options.logInserted)
                console.log(`👤 Inserted ${inserted.length} users`);
        }

        if (config.loadGroups) {
            if (config.options.clearBeforeInsert) await Group.deleteMany({});
            const groups = await loadJSON<any[]>("groups.json");
            const inserted = await Group.insertMany(groups);
            if (config.options.logInserted)
                console.log(`👥 Inserted ${inserted.length} groups`);
        }

        if (config.loadClients) {
            if (config.options.clearBeforeInsert) await Client.deleteMany({});
            const clients = await loadJSON<any[]>("clients.json");
            const inserted = await Client.insertMany(clients);
            if (config.options.logInserted)
                console.log(`📞 Inserted ${inserted.length} clients`);
        }

        if (config.loadRides) {
            if (config.options.clearBeforeInsert) await Ride.deleteMany({});
            const rides = await loadJSON<any[]>("rides.json");
            const inserted = await Ride.insertMany(rides);
            if (config.options.logInserted)
                console.log(`🚗 Inserted ${inserted.length} rides`);
        }
    });

    await mongoose.connection.close();
    console.log("✅ Seeding complete");
}

run().catch((err) => {
    console.error("❌ Seeding failed", err);
    process.exit(1);
});
