import mongoose from "mongoose";

let cachedConn: typeof mongoose | null = null;
let cachedPromise: Promise<typeof mongoose> | null = null;

export async function connectDb(): Promise<typeof mongoose> {
    if (cachedConn) return cachedConn;

    if (!cachedPromise) {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error("MONGODB_URI is not set");

        mongoose.set("strictQuery", true);

        cachedPromise = mongoose.connect(uri, {
            // keep defaults minimal; tune as needed
            maxPoolSize: 10
        }).then((conn) => {
            cachedConn = conn;
            bindLifecycleHandlers();
            return conn;
        });
    }

    return cachedPromise;
}

function bindLifecycleHandlers() {
    const conn = mongoose.connection;

    conn.on("connected", () => {
        console.log("🔌 Mongo connected:", conn.host);
    });

    conn.on("error", (err) => {
        console.error("🛑 Mongo error:", err);
    });

    conn.on("disconnected", () => {
        console.warn("⚠️ Mongo disconnected");
    });

    const shutdown = async (signal: NodeJS.Signals) => {
        try {
            await mongoose.connection.close();
            console.log(`👋 Mongo connection closed on ${signal}`);
            process.exit(0);
        } catch (e) {
            console.error("Error during Mongo shutdown:", e);
            process.exit(1);
        }
    };

    ["SIGINT", "SIGTERM"].forEach((sig) =>
        process.once(sig as NodeJS.Signals, () => shutdown(sig as NodeJS.Signals))
    );
}

// Optional helper for scripts
export async function withDb<T>(fn: () => Promise<T>): Promise<T> {
    await connectDb();
    try {
        return await fn();
    } finally {
        // leave connection open for app; close for one-off scripts if desired
        if (process.env.CLOSE_DB_AFTER === "true") {
            await mongoose.connection.close();
            cachedConn = null;
            cachedPromise = null;
        }
    }
}
