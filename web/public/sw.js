self.addEventListener("push", function (event) {
    console.log("[SW] Push event received", event);
    
    let data = {};
    let title = "DriveBetter";
    let body = "You have a new notification";
    let icon = "/drivebetter-192.png";
    
    try {
        if (event.data) {
            const text = event.data.text();
            console.log("[SW] Push data text:", text);
            
            if (text) {
                try {
                    data = JSON.parse(text);
                    console.log("[SW] Parsed push data:", data);
                    title = data.title || title;
                    body = data.body || body;
                    icon = data.icon || icon;
                } catch (parseError) {
                    console.error("[SW] Failed to parse push data as JSON:", parseError);
                    // If parsing fails, try to use the text as body
                    body = text;
                }
            }
        }
    } catch (error) {
        console.error("[SW] Error processing push event:", error);
    }
    
    const options = {
        body: body,
        icon: icon,
        badge: "/drivebetter-192.png",
        vibrate: [100, 50, 100],
        tag: data.tag || "default",
        requireInteraction: false,
        data: {
            dateOfArrival: Date.now(),
            url: data.url || "/",
            ...data,
        },
    };
    
    console.log("[SW] Showing notification:", title, options);
    
    event.waitUntil(
        self.registration.showNotification(title, options).catch((error) => {
            console.error("[SW] Failed to show notification:", error);
        })
    );
});

self.addEventListener("notificationclick", function (event) {
    console.log("[SW] Notification click received", event.notification);
    
    event.notification.close();
    
    const urlToOpen = event.notification.data?.url || "/";
    
    event.waitUntil(
        clients
            .matchAll({
                type: "window",
                includeUncontrolled: true,
            })
            .then((clientList) => {
                // Check if there's already a window open
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if (client.url && client.focus) {
                        console.log("[SW] Focusing existing client:", client.url);
                        return client.focus();
                    }
                }
                
                // If no window is open, open a new one
                if (clients.openWindow) {
                    console.log("[SW] Opening new window:", urlToOpen);
                    return clients.openWindow(urlToOpen);
                }
            })
            .catch((error) => {
                console.error("[SW] Error handling notification click:", error);
            })
    );
});
