import { Router, Request, Response } from "express";

const router = Router();

/**
 * @openapi
 * /notifications/test:
 *   post:
 *     summary: Send a test notification (dev only)
 *     tags: [Notifications]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               to: { type: string }
 *               message: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.post("/test", async (req: Request, res: Response) => {
    const { to = "debug", message = "Hello from DriveBetter" } = req.body || {};
    // Stub: in future integrate AWS SNS / Twilio / WhatsApp Business API
    console.log("📣 Test notification:", { to, message });
    res.json({ ok: true, delivered: true });
});

export default router;
