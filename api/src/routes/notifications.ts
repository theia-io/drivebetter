import { Request, Response, Router } from "express";
import webpush from "web-push";

const router = Router();

console.log("NEXT_PUBLIC_VAPID_PUBLIC_KEY:", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
console.log("VAPID_PRIVATE_KEY:", process.env.VAPID_PRIVATE_KEY);

webpush.setVapidDetails(
    "mailto:support@drivebetter.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

let subscription: PushSubscription | null = null;

router.post("/subscribe", async (req: Request, res: Response) => {
    const newSubscription = req.body.subscription as PushSubscription;
    subscription = newSubscription;
    res.json({ ok: true, subscription });
});

router.post("/unsubscribe", async (req: Request, res: Response) => {
    subscription = null;
    res.json({ ok: true });
});

router.post("/send", async (req: Request, res: Response) => {
    if (!subscription) {
        return res.status(400).json({ error: "No subscription found" });
    }

    try {
        await webpush.sendNotification(
            subscription,
            JSON.stringify({
                title: "Test Notification",
                body: "This is a test notification",
                // icon: '/icon.png',
            })
        );
        return res.json({ ok: true, delivered: true });
    } catch (error) {
        return res.status(500).json({ error: "Failed to send notification" });
    }
});

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
