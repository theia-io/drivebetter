"use client";

import { Switch } from "@/components/ui/switch";
import { apiPost } from "@/services/http";
import { useAuthStore } from "@/stores";
import { cn } from "@/utils/css";
import { collectDeviceInfo, generateDeviceName } from "@/utils/deviceInfo";
import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export default function PushNotificationsSwitch({ className }: { className?: string }) {
    const [isSupported, setIsSupported] = useState(false);
    const [subscription, setSubscription] = useState<PushSubscription | null>();

    const { fetchMe } = useAuthStore();

    useEffect(() => {
        if ("serviceWorker" in navigator && "PushManager" in window) {
            setIsSupported(true);
            registerServiceWorker();
        }
    }, []);

    async function registerServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register("/sw.js", {
                scope: "/",
                updateViaCache: "none",
            });
            console.log("[Push Notifications] Service worker registered:", registration);

            // Check if there's an existing subscription
            const sub = await registration.pushManager.getSubscription();
            if (sub) {
                console.log("[Push Notifications] Existing subscription found:", sub);
                setSubscription(sub);
            } else {
                console.log("[Push Notifications] No existing subscription");
            }

            // Listen for service worker updates
            registration.addEventListener("updatefound", () => {
                console.log("[Push Notifications] Service worker update found");
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener("statechange", () => {
                        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                            console.log(
                                "[Push Notifications] New service worker installed, reload to activate"
                            );
                        }
                    });
                }
            });
        } catch (error) {
            console.error("[Push Notifications] Error registering service worker:", error);
        }
    }

    async function subscribeToPush() {
        try {
            // Request notification permission first
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                console.error("Notification permission denied:", permission);
                alert("Notification permission is required to receive push notifications.");
                return;
            }

            // Ensure service worker is registered and ready
            const registration = await navigator.serviceWorker.ready;

            // Subscribe to push notifications
            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(
                    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
                ),
            });

            // Collect device information (privacy-compliant)
            const deviceInfo = collectDeviceInfo();
            const deviceName = generateDeviceName(deviceInfo);

            // PushSubscription properties are readonly/getters and don't spread correctly
            // Must serialize it first using JSON.parse/stringify to extract the properties
            const serializedSub = JSON.parse(JSON.stringify(sub));

            // Build the complete subscription object with device info
            const pushSubscription = {
                ...serializedSub, // Contains endpoint, keys, expirationTime
                deviceName,
                deviceInfo,
                subscribedAt: new Date().toISOString(),
            };

            setSubscription(sub); // Keep the original PushSubscription object for state (needed for unsubscribe)

            // Send subscription to server
            await apiPost("/push-notifications/subscribe", pushSubscription);
            console.log("[Push Notifications] Subscription saved to server");

            await fetchMe();
        } catch (error) {
            console.error("[Push Notifications] Error subscribing to push:", error);
            alert("Failed to subscribe to push notifications: " + (error as Error).message);
        }
    }

    async function unsubscribeFromPush() {
        await subscription?.unsubscribe();
        setSubscription(null);

        const response = await apiPost("/push-notifications/unsubscribe", {
            endpoint: subscription?.endpoint,
        });
        console.log("[Push Notifications] Unsubscription response:", response);

        await fetchMe();
    }

    if (!isSupported) {
        return (
            <p>
                Push notifications are not supported in this browser. We support push-notifications
                for installed applications only.
            </p>
        );
    }

    return (
        <Switch
            className={cn(className)}
            checked={subscription ? true : false}
            onCheckedChange={(checked) => {
                if (checked) {
                    subscribeToPush();
                } else {
                    unsubscribeFromPush();
                }
            }}
        />
    );
}
