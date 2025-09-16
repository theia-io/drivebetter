/**
 * Dev seeding entrypoint.
 * Loads .env, ensures NODE_ENV=development, then imports the main seed script.
 */
import dotenv from "dotenv";
dotenv.config();

if (!process.env.NODE_ENV) {
    // @ts-ignore
    process.env.NODE_ENV = "development";
}

(async () => {
    try {
        console.log("🌱 Starting dev seed (NODE_ENV=%s)", process.env.NODE_ENV);
        // Importing executes the seed script's top-level run()
        await import("../lib/seed/seed");
        console.log("✅ Dev seed finished");
    } catch (err) {
        console.error("❌ Dev seed failed:", err);
        process.exit(1);
    }
})();
