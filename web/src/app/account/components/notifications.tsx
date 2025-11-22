"use client";

import { Button } from "@/components/ui";
import { apiPost } from "@/services/http";
import { useAuthStore } from "@/stores";
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

export default function Notifications({ className }: { className?: string }) {
    const { user } = useAuthStore();
    const [isSupported, setIsSupported] = useState(false);
    const [subscription, setSubscription] = useState<PushSubscription | null>(
        user?.notifications?.[0] || null
    );

    console.log("USER", user);

    const [message, setMessage] = useState("");

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
            console.log("[Notifications] Service worker registered:", registration);

            // Check if there's an existing subscription
            const sub = await registration.pushManager.getSubscription();
            if (sub) {
                console.log("[Notifications] Existing subscription found:", sub);
                setSubscription(sub);
            } else {
                console.log("[Notifications] No existing subscription");
            }

            // Listen for service worker updates
            registration.addEventListener("updatefound", () => {
                console.log("[Notifications] Service worker update found");
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener("statechange", () => {
                        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                            console.log(
                                "[Notifications] New service worker installed, reload to activate"
                            );
                        }
                    });
                }
            });
        } catch (error) {
            console.error("[Notifications] Error registering service worker:", error);
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
            console.log("[Notifications] Service worker ready:", registration);

            // Subscribe to push notifications
            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(
                    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
                ),
            });

            console.log("[Notifications] Push subscription created:", sub);
            setSubscription(sub);

            // Serialize subscription for sending to server
            const serializedSub = JSON.parse(JSON.stringify(sub));
            console.log("[Notifications] Serialized subscription:", serializedSub);

            // Send subscription to server
            await apiPost("/notifications/subscribe", { subscription: serializedSub });
            console.log("[Notifications] Subscription saved to server");
        } catch (error) {
            console.error("[Notifications] Error subscribing to push:", error);
            alert("Failed to subscribe to push notifications: " + (error as Error).message);
        }
    }

    async function unsubscribeFromPush() {
        console.log("unsubscribeFromPush", subscription);
        await subscription?.unsubscribe();
        setSubscription(null);

        // await unsubscribeUser();
        await apiPost("/notifications/unsubscribe");
    }

    async function sendTestNotification() {
        if (subscription) {
            // await sendNotification(message);
            await apiPost("/notifications/send", {
                body: message ?? "Interval test",
                title: "Test Notification",
            });
            setMessage("");
        }
    }

    if (subscription) {
        setInterval(sendTestNotification, 10000);
    }

    if (!isSupported) {
        return <p>Push notifications are not supported in this browser.</p>;
    }

    return (
        <div className={className}>
            {subscription ? (
                <>
                    <div className="flex items-center gap-2">
                        <p>You are subscribed to push notifications.</p>
                        <Button onClick={unsubscribeFromPush}>Unsubscribe</Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Enter notification message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                        <Button onClick={sendTestNotification}>Send Test</Button>
                    </div>
                </>
            ) : (
                <>
                    <p>You are not subscribed to push notifications.</p>
                    <button onClick={subscribeToPush}>Subscribe</button>
                </>
            )}
        </div>
    );
}
