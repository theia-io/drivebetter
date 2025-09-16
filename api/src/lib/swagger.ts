import type { Express, Request, Response } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import path from "path";

function buildSpec() {
    return swaggerJsdoc({
        definition: {
            openapi: "3.0.3",
            info: {
                title: "DriveBetter API",
                version: "1.0.0",
                description: "API documentation for DriveBetter MVP",
            },
            servers: [{ url: "/api/v1" }],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: "http",
                        scheme: "bearer",
                        bearerFormat: "JWT",
                        description: "Use an access token: `Bearer <token>`",
                    },
                },
            },
            // Set default security for all endpoints; public endpoints can override with `security: []` in their @openapi block
            security: [{ bearerAuth: [] }],
        },
        // JSDoc sources
        apis: [
            path.join(process.cwd(), "src/routes/**/*.ts"),
            path.join(process.cwd(), "src/models/*.ts"),
        ],
    });
}

export function setupSwagger(app: Express) {
    const isDev = process.env.NODE_ENV !== "production";

    // In dev, rebuild the spec on every request so changes appear immediately
    app.get("/api/openapi.json", (_req: Request, res: Response) => {
        const spec = isDev ? buildSpec() : (global as any).__swaggerSpec || buildSpec();
        if (!isDev) (global as any).__swaggerSpec = spec;
        res.json(spec);
    });

    // Swagger UI—pass persistAuthorization so the token stays after refresh
    app.use(
        "/api/docs",
        (req, res, next) => {
            // rebuild per request in dev
            (req as any).__swaggerSpec = (isDev ? buildSpec() : (global as any).__swaggerSpec || buildSpec());
            if (!isDev) (global as any).__swaggerSpec = (req as any).__swaggerSpec;
            next();
        },
        swaggerUi.serve,
        (req: Request, res: Response) =>
            swaggerUi.setup((req as any).__swaggerSpec, {
                swaggerOptions: { persistAuthorization: true },
            })(req, res)
    );
}
