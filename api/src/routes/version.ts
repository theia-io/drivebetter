import { Router, Request, Response } from "express";

const router = Router();

/**
 * @openapi
 * /version:
 *   get:
 *     summary: Get API version info
 *     tags: [Meta]
 *     responses:
 *       200:
 *         description: API version and build information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   example: "drivebetter-api"
 *                 version:
 *                   type: string
 *                   example: "1.4.3"
 *                 commit:
 *                   type: string
 *                   example: "abc1234"
 *                 buildTime:
 *                   type: string
 *                   format: date-time
 */
router.get("/", (req: Request, res: Response) => {
    const pkgName = process.env.npm_package_name || "drivebetter-api";
    const version =
        process.env.APP_VERSION ||
        process.env.npm_package_version ||
        "0.0.0-dev";

    const payload = {
        name: pkgName,
        version,
        commit: process.env.APP_COMMIT || "dev",
        buildTime: process.env.APP_BUILD_TIME || null,
    };

    res.json(payload);
});

export default router;
