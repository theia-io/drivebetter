import webpush from "web-push";
import { IUser } from "../models/user.model";

// Initialize VAPID details (should match push-notifications.ts)
webpush.setVapidDetails(
    "mailto:support@drivebetter.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

export interface NotificationOptions {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    url?: string;
}

export interface NotificationResult {
    endpoint: string;
    success: boolean;
    error?: string;
}

export interface SendNotificationResult {
    ok: boolean;
    delivered: boolean;
    results: NotificationResult[];
    total: number;
    successful: number;
}

/**
 * Send push notification to a specific user by userId
 * @param userId - User ID to send notification to
 * @param options - Notification options (title, body, etc.)
 * @returns Result object with delivery status
 */
export async function sendPushNotificationToUser(
    user: IUser,
    options: NotificationOptions
): Promise<SendNotificationResult> {
    console.log("[sendPushNotificationToUser] user", user, options);

    if (!user.subscriptions || user.subscriptions.length === 0) {
        return {
            ok: true,
            delivered: false,
            results: [],
            total: 0,
            successful: 0,
        };
    }

    const { title, body, icon, badge, tag, url } = options;
    const notificationPayload = JSON.stringify({
        title,
        body,
        icon: icon || "/drivebetter-192.png",
        badge: badge || "/drivebetter-192.png",
        tag: tag || "default",
        url: url || "/",
    });

    const results: NotificationResult[] = [];

    for (const subscription of user.subscriptions) {
        try {
            await webpush.sendNotification(subscription as any, notificationPayload);
            results.push({ endpoint: subscription.endpoint, success: true });
        } catch (error: any) {
            console.error("[sendPushNotificationToUser] Error sending push notification:", error);

            // If subscription is invalid, remove it
            if (error.statusCode === 410 || error.statusCode === 404) {
                user.subscriptions = user.subscriptions!.filter(
                    (sub) => sub.endpoint !== subscription.endpoint
                );
                await user.save();
            }
            results.push({
                endpoint: subscription.endpoint,
                success: false,
                error: error.message,
            });
        }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log("[sendPushNotificationToUser] results", results, successCount);

    return {
        ok: true,
        delivered: successCount > 0,
        results,
        total: user.subscriptions.length,
        successful: successCount,
    };
}

/**
 * Send push notification to multiple users
 * @param userIds - Array of user IDs to send notification to
 * @param options - Notification options
 * @returns Array of results for each user
 */
export async function sendPushNotificationToUsers(
    users: IUser[],
    options: NotificationOptions
): Promise<SendNotificationResult[]> {
    const results = await Promise.allSettled(
        users.map((user) => sendPushNotificationToUser(user, options))
    );

    return results.map((result, index) => {
        if (result.status === "fulfilled") {
            return result.value;
        } else {
            return {
                ok: false,
                delivered: false,
                results: [],
                total: 0,
                successful: 0,
            };
        }
    });
}
