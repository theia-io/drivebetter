import { Request, Response, Router } from "express";
import { PushSubscription } from "web-push";
import { requireAuth } from "../lib/auth";
import { sendPushNotificationToUser } from "../lib/pushNotifications";
import User, { Subscription } from "../models/user.model";

const router = Router();

/**
 * @openapi
 * /push-notifications/subscribe:
 *   post:
 *     summary: Subscribe to push notifications
 *     tags: [Push Notifications]
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
    const subscription = req.body as Subscription;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        return res.status(400).json({ error: "Invalid subscription data" });
    }

    const dbUser = await User.findById(user.id);
    if (!dbUser) {
        return res.status(404).json({ error: "User not found" });
    }

    // Ensure required fields are present
    const subscriptionData: Subscription = {
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime || null,
        keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
        },
        deviceName: subscription.deviceName || "Unknown Device",
        subscribedAt: subscription.subscribedAt ? new Date(subscription.subscribedAt) : new Date(),
        // Include device info if provided (optional, privacy-compliant)
        deviceInfo: subscription.deviceInfo || undefined,
    };

    // Check if subscription already exists (by endpoint)
    const existingIndex =
        dbUser.subscriptions?.findIndex((sub) => sub.endpoint === subscription.endpoint) ?? -1;

    if (existingIndex >= 0) {
        // Update existing subscription (preserve device info if not provided in update)
        const existing = dbUser.subscriptions![existingIndex];
        dbUser.subscriptions![existingIndex] = {
            ...subscriptionData,
            deviceInfo: subscriptionData.deviceInfo || existing.deviceInfo,
        };
    } else {
        // Add new subscription
        if (!dbUser.subscriptions) {
            dbUser.subscriptions = [];
        }
        dbUser.subscriptions.push(subscriptionData);
    }

    await dbUser.save();

    res.json({ ok: true, subscription: subscriptionData });
});

/**
 * @openapi
 * /push-notifications/unsubscribe:
 *   post:
 *     summary: Unsubscribe from push notifications
 *     tags: [Push Notifications]
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
    }
    // Should we remove all subscriptions if endpoint is not provided?
    // else {
    //     // Remove all subscriptions
    //     dbUser.subscriptions = [];
    // }

    await dbUser.save();
    res.json({ ok: true });
});

/**
 * @openapi
 * /push-notifications/send:
 *   post:
 *     summary: Send a test notification to a user
 *     tags: [Push Notifications]
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
    const title = req.body?.title || "DriveBetter";
    const body = req.body?.body || "You have a message from DriveBetter";

    const user = await User.findById(targetUserId);
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }

    try {
        const result = await sendPushNotificationToUser(user, {
            title,
            body,
            icon: req.body?.icon,
            badge: req.body?.badge,
            tag: req.body?.tag,
            url: req.body?.url,
        });

        if (!result.delivered && result.total === 0) {
            return res.status(400).json({ error: "No subscription found for this user" });
        }

        return res.json(result);
    } catch (error: any) {
        if (error.message === "User not found") {
            return res.status(404).json({ error: "User not found" });
        }
        return res
            .status(500)
            .json({ error: "Failed to send notification", message: error.message });
    }
});

export default router;
