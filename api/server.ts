import express, { RequestHandler } from "express"; // Import RequestHandler
import next from "next";
import mongoose from "mongoose";
import { setupSwagger } from "./src/lib/swagger";
import cors from "cors";
import { env, validateEnv, getCorsOrigins, isDevelopment } from "./src/lib/env";

import users from "./src/routes/users";
import rides from "./src/routes/rides";
import ridesShares from "./src/routes/ridesShares";
import auth from "./src/routes/auth";
import oauth from "./src/routes/oauth";
import groups from "./src/routes/groups";
import calendar from "./src/routes/calendar";
import clients from "./src/routes/clients";
import notifications from "./src/routes/notifications";
import healthRoutes from "./src/routes/health";
import geo from "./src/routes/geo";
import driverReviews from "./src/routes/driverReviews";
import driverDetails from "./src/routes/driverDetails";

async function startExpressServer(isNextJsEnabled: boolean, nextHandle?: ReturnType<typeof next>['getRequestHandler']) {
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
        server.use("/api/v1/users", users);
        server.use("/api/v1/drivers-reviews", driverReviews);
        server.use("/api/v1/driver-details", driverDetails);
        server.use("/api/v1/ride-shares", ridesShares);
        server.use("/api/v1/rides", rides);
        server.use("/api/v1/auth", auth);
        server.use("/api/v1/oauth", oauth);
        server.use("/api/v1/groups", groups);
        server.use("/api/v1/calendar", calendar);
        server.use("/api/v1/clients", clients);
        server.use("/api/v1/notifications", notifications);
        server.use("/api/v1/health", healthRoutes);
        server.use("/api/v1/geo", geo);

        setupSwagger(server);

        if (isNextJsEnabled && nextHandle) {
            server.all("*", nextHandle as RequestHandler);
        }

        server.listen(env.PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on port ${env.PORT}`);
            console.log(`📚 Swagger UI: http://localhost:${env.PORT}/api/docs`);
            console.log(`📋 OpenAPI:    http://localhost:${env.PORT}/api/openapi.json`);
            console.log(`🌍 Environment: ${env.NODE_ENV}`);
        });
    } catch (error) {
        console.error('❌ FATAL EXPRESS STARTUP ERROR:', error);
        process.exit(1);
    }
}

(async () => {
    try {
        validateEnv();
        console.log('✅ Environment variables loaded and validated successfully');
    } catch (error) {
        console.error('❌ Environment validation failed:', error);
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
                console.error('❌ Next.js Prepare Failed in DEV:', err);
                process.exit(1);
            });
    } else {
        await startExpressServer(false);
    }
})();