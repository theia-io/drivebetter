/**
 * Dev DB cleanup script.
 * By default clears known collections; set CLEAR_DROP_DB=true to drop the whole DB.
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/user.model";
import Group from "../models/group.model";
import Client from "../models/client.model";
import Ride from "../models/ride.model";

dotenv.config();

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/drivebetter";
const dropAll = String(process.env.CLEAR_DROP_DB || "").toLowerCase() === "true";

async function main() {
    console.log("🧹 Connecting to Mongo:", uri);
    await mongoose.connect(uri);

    if (dropAll) {
        console.warn("⚠️ CLEAR_DROP_DB=true — dropping entire database...");
        await mongoose.connection.dropDatabase();
        console.log("✅ Database dropped");
    } else {
        console.log("🧽 Clearing collections (users, groups, clients, rides)...");
        await Promise.all([
            User.deleteMany({}),
            Group.deleteMany({}),
            Client.deleteMany({}),
            Ride.deleteMany({}),
        ]);
        console.log("✅ Collections cleared");
    }

    await mongoose.connection.close();
    console.log("👋 Done");
}

main().catch((err) => {
    console.error("❌ Clear script failed:", err);
    process.exit(1);
});
