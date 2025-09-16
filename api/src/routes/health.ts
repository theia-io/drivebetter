import { Router, Request, Response } from "express";
import mongoose from "mongoose";

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     description: Returns API and DB connectivity status.
 *     tags: [System]
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/", async (_req: Request, res: Response) => {
    const dbState = mongoose.connection.readyState;
    const states: Record<number, string> = {
        0: "disconnected",
        1: "connected",
        2: "connecting",
        3: "disconnecting",
    };

    res.json({
        status: "ok",
        uptime: process.uptime(),
        db: {
            state: states[dbState] || "unknown",
        },
        timestamp: new Date().toISOString(),
    });
});

export default router;
