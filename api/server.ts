import express from "express";
import next from "next";
import mongoose from "mongoose";
import { setupSwagger } from "./src/lib/swagger";

import users from "./src/routes/users";
import rides from "./src/routes/rides";
import auth from "./src/routes/auth";
import oauth from "./src/routes/oauth";
import groups from "./src/routes/groups";
import calendar from "./src/routes/calendar";
import clients from "./src/routes/clients";
import notifications from "./src/routes/notifications";
import healthRoutes from "./src/routes/health";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/drivebetter");

    const server = express();
    server.use(express.json());

    // mount REST
    server.use("/api/v1/users", users);
    server.use("/api/v1/rides", rides);
    server.use("/api/v1/auth", auth);
    server.use("/api/v1/oauth", oauth);
    server.use("/api/v1/groups", groups);
    server.use("/api/v1/calendar", calendar);
    server.use("/api/v1/clients", clients);
    server.use("/api/v1/notifications", notifications);
    server.use("/api/v1/health", healthRoutes);

    // mount swagger
    setupSwagger(server);

    // Next handles everything else
    server.all("*", (req, res) => handle(req, res));

    server.listen(Number(process.env.PORT) || 3000, () => {
        console.log("Swagger UI: http://localhost:3000/api/docs");
        console.log("OpenAPI:    http://localhost:3000/api/openapi.json");
    });
});
