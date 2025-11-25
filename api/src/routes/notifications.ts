import { Request, Response, Router } from "express";
import webpush, { PushSubscription } from "web-push";
import { requireAuth } from "../lib/auth";
import User from "../models/user.model";

const router = Router();

console.log("NEXT_PUBLIC_VAPID_PUBLIC_KEY:", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
console.log("VAPID_PRIVATE_KEY:", process.env.VAPID_PRIVATE_KEY);

webpush.setVapidDetails(
    "mailto:support@drivebetter.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

/**
 * @openapi
 * /notifications/subscribe:
 *   post:
 *     summary: Subscribe to push notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subscription]
 *             properties:
 *               subscription:
 *                 type: object
 *                 properties:
 *                   endpoint: { type: string }
 *                   expirationTime: { type: number, nullable: true }
 *                   keys:
 *                     type: object
 *                     properties:
 *                       p256dh: { type: string }
 *                       auth: { type: string }
 *     responses:
 *       200: { description: Subscribed successfully }
 *       401: { description: Unauthorized }
 */
router.post("/subscribe", requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const subscription = req.body.subscription as PushSubscription;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        return res.status(400).json({ error: "Invalid subscription data" });
    }

    const dbUser = await User.findById(user.id);
    if (!dbUser) {
        return res.status(404).json({ error: "User not found" });
    }

    // Check if subscription already exists (by endpoint)
    const existingIndex =
        dbUser.subscriptions?.findIndex((sub) => sub.endpoint === subscription.endpoint) ?? -1;

    if (existingIndex >= 0) {
        // Update existing subscription
        dbUser.subscriptions![existingIndex] = subscription;
    } else {
        // Add new subscription
        if (!dbUser.subscriptions) {
            dbUser.subscriptions = [];
        }
        dbUser.subscriptions.push(subscription);
    }

    await dbUser.save();

    res.json({ ok: true, subscription });
});

/**
 * @openapi
 * /notifications/unsubscribe:
 *   post:
 *     summary: Unsubscribe from push notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               endpoint: { type: string, description: "Optional: specific endpoint to unsubscribe" }
 *     responses:
 *       200: { description: Unsubscribed successfully }
 *       401: { description: Unauthorized }
 */
router.post("/unsubscribe", requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const endpoint = req.body?.endpoint as string | undefined;

    const dbUser = await User.findById(user.id);
    if (!dbUser) {
        return res.status(404).json({ error: "User not found" });
    }

    if (endpoint) {
        // Remove specific subscription by endpoint
        dbUser.subscriptions =
            dbUser.subscriptions?.filter((sub) => sub.endpoint !== endpoint) ?? [];
    } else {
        // Remove all subscriptions
        dbUser.subscriptions = [];
    }

    await dbUser.save();
    res.json({ ok: true });
});

/**
 * @openapi
 * /notifications/send:
 *   post:
 *     summary: Send a test notification to a user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId: { type: string, description: "User ID to send to (defaults to current user)" }
 *               title: { type: string, default: "Test Notification" }
 *               body: { type: string, default: "This is a test notification" }
 *     responses:
 *       200: { description: Notification sent successfully }
 *       400: { description: No subscription found }
 *       401: { description: Unauthorized }
 */
router.post("/send", requireAuth, async (req: Request, res: Response) => {
    const currentUser = (req as any).user;

    const targetUserId = req.body?.userId || currentUser.id;
    const title = req.body?.title || "Test Notification";
    const body = req.body?.body || "This is a test notification";

    const user = await User.findById(targetUserId);
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }

    if (!user.subscriptions || user.subscriptions.length === 0) {
        return res.status(400).json({ error: "No subscription found for this user" });
    }

    const results = [];
    for (const subscription of user.subscriptions) {
        try {
            await webpush.sendNotification(subscription as any, JSON.stringify({ title, body }));
            results.push({ endpoint: subscription.endpoint, success: true });
        } catch (error: any) {
            // If subscription is invalid, remove it
            if (error.statusCode === 410 || error.statusCode === 404) {
                user.subscriptions = user.subscriptions.filter(
                    (sub) => sub.endpoint !== subscription.endpoint
                );
                await user.save();
            }
            results.push({ endpoint: subscription.endpoint, success: false, error: error.message });
        }
    }

    const successCount = results.filter((r) => r.success).length;
    return res.json({
        ok: true,
        delivered: successCount > 0,
        results,
        total: user.subscriptions.length,
        successful: successCount,
    });
});

export default router;
