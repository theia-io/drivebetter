import express from "express";
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
import drivers from "./src/routes/driverDetails";

try {
  validateEnv();
  console.log('✅ Environment variables loaded and validated successfully');
} catch (error) {
  console.error('❌ Environment validation failed:', error);
  process.exit(1);
}

const app = next({ dev: isDevelopment() });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  await mongoose.connect(env.MONGODB_URI);

  const server = express();
  server.use(express.json());

  // CORS configuration
  server.use(
    cors({
      origin: getCorsOrigins(),
      credentials: false,
    })
  );
  // mount REST
  server.use("/api/v1/users", users);
  server.use("/api/v1/driver-details", drivers);
  server.use("/api/v1/rides", rides);
  server.use("/api/v1/ride-shares", ridesShares);
  server.use("/api/v1/auth", auth);
  server.use("/api/v1/oauth", oauth);
  server.use("/api/v1/groups", groups);
  server.use("/api/v1/calendar", calendar);
  server.use("/api/v1/clients", clients);
  server.use("/api/v1/geo", geo);
  server.use("/api/v1/notifications", notifications);
  server.use("/api/v1/health", healthRoutes);

  // mount swagger
  setupSwagger(server);

  // Next handles everything else
  server.all("*", (req, res) => handle(req, res));

  server.listen(env.PORT, () => {
    console.log(`🚀 Server running on port ${env.PORT}`);
    console.log(`📚 Swagger UI: http://localhost:${env.PORT}/api/docs`);
    console.log(`📋 OpenAPI:    http://localhost:${env.PORT}/api/openapi.json`);
    console.log(`🌍 Environment: ${env.NODE_ENV}`);
  });
});
