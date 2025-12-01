// @ts-ignore
import express, { RequestHandler } from "express";
import next from "next";
import mongoose from "mongoose";
import { setupSwagger } from "./src/lib/swagger";
// @ts-ignore
import cors from "cors";
import { env, validateEnv, getCorsOrigins, isDevelopment } from "./src/lib/env";

import usersRoutes from "./src/routes/users";
import ridesRoutes from "./src/routes/rides";
import ridesSharesRoutes from "./src/routes/ridesShares";
import authRoutes from "./src/routes/auth";
import oauth from "./src/routes/oauth";
import groupsRoutes from "./src/routes/groups";
import calendarRoutes from "./src/routes/calendar";
import customersRoutes from "./src/routes/customers";
import pushNotificationsRoutes from "./src/routes/push-notifications";
import healthRoutes from "./src/routes/health";
import geoRoutes from "./src/routes/geo";
import driverReviewsRoutes from "./src/routes/driverReviews";
import driverDetailsRoutes from "./src/routes/driverDetails";
import versionRoutes from "./src/routes/version";

async function startExpressServer(
    isNextJsEnabled: boolean,
    nextHandle?: ReturnType<typeof next>["getRequestHandler"]
) {
    try {
        await mongoose.connect(env.MONGODB_URI);

        const server = express();
        server.use(express.json());

        server.use(
            cors({
                origin: getCorsOrigins(),
                credentials: false,
            })
        );
        server.use("/api/v1/users", usersRoutes);
        server.use("/api/v1/drivers-reviews", driverReviewsRoutes);
        server.use("/api/v1/driver-details", driverDetailsRoutes);
        server.use("/api/v1/ride-shares", ridesSharesRoutes);
        server.use("/api/v1/rides", ridesRoutes);
        server.use("/api/v1/auth", authRoutes);
        server.use("/api/v1/oauth", oauth);
        server.use("/api/v1/groups", groupsRoutes);
        server.use("/api/v1/calendar", calendarRoutes);
        server.use("/api/v1/customers", customersRoutes);
        server.use("/api/v1/push-notifications", pushNotificationsRoutes);
        server.use("/api/v1/health", healthRoutes);
        server.use("/api/v1/geo", geoRoutes);
        server.use("/api/v1/version", versionRoutes);

        setupSwagger(server);

        if (isNextJsEnabled && nextHandle) {
            server.all("*", nextHandle as RequestHandler);
        }

        server.listen(env.PORT, "0.0.0.0", () => {
            console.log(`🚀 Server running on port ${env.PORT}`);
            console.log(`📚 Swagger UI: http://localhost:${env.PORT}/api/docs`);
            console.log(`📋 OpenAPI:    http://localhost:${env.PORT}/api/openapi.json`);
            console.log(`🌍 Environment: ${env.NODE_ENV}`);
        });
    } catch (error) {
        console.error("❌ FATAL EXPRESS STARTUP ERROR:", error);
        process.exit(1);
    }
}

(async () => {
    try {
        validateEnv();
        console.log("✅ Environment variables loaded and validated successfully");
    } catch (error) {
        console.error("❌ Environment validation failed:", error);
        process.exit(1);
    }

    if (isDevelopment()) {
        const app = next({ dev: isDevelopment() });
        const handle = app.getRequestHandler();

        app.prepare()
            .then(async () => {
                // The handle is now correctly defined in the local scope and accessible here.
                await startExpressServer(true, () => handle);
            })
            .catch((err) => {
                console.error("❌ Next.js Prepare Failed in DEV:", err);
                process.exit(1);
            });
    } else {
        await startExpressServer(false);
    }
})();
