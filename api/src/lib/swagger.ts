import type { Express, Request, Response, NextFunction } from "express";
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
                        description: "Use an access token: Bearer <token>",
                    },
                },
            },
            security: [{ bearerAuth: [] }],
        },
        apis: [
            path.join(process.cwd(), "src/routes/**/*.ts"),
            path.join(process.cwd(), "src/models/*.ts"),
        ],
    });
}

export function setupSwagger(app: Express) {
    const isDev = process.env.NODE_ENV !== "production";

    // Raw JSON — rebuild on each request in dev
    app.get("/api/openapi.json", (_req: Request, res: Response) => {
        const spec = isDev ? buildSpec() : ((global as any).__swaggerSpec ?? buildSpec());
        if (!isDev) (global as any).__swaggerSpec = spec;
        res.json(spec);
    });

    // UI — compute spec, stash in locals, then feed into swaggerUi.setup
    app.use(
        "/api/docs",
        (req: Request, res: Response, next: NextFunction) => {
            const spec = isDev ? buildSpec() : ((global as any).__swaggerSpec ?? buildSpec());
            if (!isDev) (global as any).__swaggerSpec = spec;
            (res.locals as any).swaggerSpec = spec;
            next();
        },
        swaggerUi.serve,
        (req: Request, res: Response, next: NextFunction) => {
            const spec = (res.locals as any).swaggerSpec;
            const handler = swaggerUi.setup(spec, {
                swaggerOptions: { persistAuthorization: true },
            });
            return handler(req, res, next); // ✅ pass (req, res, next)
        }
    );
}
