"use client";

import { useEffect } from "react";

/**
 * Registers the service worker early in the page lifecycle
 * This ensures PWA criteria are met before React components mount
 */
export function PWARegister() {
    useEffect(() => {
        if (typeof window === "undefined") return;

        // Always register service worker (works in dev and prod)
        if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
            console.log("[PWA] Service worker registration enabled");
            
            // Register service worker
            navigator.serviceWorker
                .register("/sw.js", {
                    scope: "/",
                })
                .then((registration) => {
                    console.log("[PWA] Service worker registered:", registration);
                    
                    // Check for updates
                    registration.addEventListener("updatefound", () => {
                        console.log("[PWA] Service worker update found");
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener("statechange", () => {
                                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                                    console.log("[PWA] New service worker installed, reload to activate");
                                }
                            });
                        }
                    });
                })
                .catch((error) => {
                    console.error("[PWA] Service worker registration failed:", error);
                });

            // Listen for controller change (when service worker takes control)
            navigator.serviceWorker.addEventListener("controllerchange", () => {
                console.log("[PWA] Service worker controller changed");
            });
        }
    }, []);

    return null;
}

