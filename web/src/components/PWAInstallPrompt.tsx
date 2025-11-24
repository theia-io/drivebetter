"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button, Card, CardBody, CardFooter, Typography } from "@/components/ui";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "pwa-install-prompt-dismissed";
const STORAGE_DISMISSED_UNTIL = "pwa-install-prompt-dismissed-until";

// Global storage for deferred prompt (in case event fires before component mounts)
declare global {
    interface Window {
        deferredPrompt?: BeforeInstallPromptEvent | null;
        pwaInstallPromptReady?: boolean;
    }
}

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);
    const [swRegistered, setSwRegistered] = useState(false);
    const [pwaCriteria, setPwaCriteria] = useState({
        hasManifest: false,
        hasServiceWorker: false,
        isHttps: false,
    });

    useEffect(() => {
        // Guard: only run in browser
        if (typeof window === "undefined") return;
        // Check if app is already installed
        const checkIfInstalled = () => {
            if (window.matchMedia("(display-mode: standalone)").matches) {
                setIsInstalled(true);
                return true;
            }
            // Also check for iOS standalone mode
            if ((window.navigator as any).standalone === true) {
                setIsInstalled(true);
                return true;
            }
            return false;
        };

        // Check PWA criteria
        const checkPwaCriteria = async () => {
            const hasManifest = document.querySelector('link[rel="manifest"]') !== null;
            const isHttps =
                window.location.protocol === "https:" ||
                window.location.hostname === "localhost" ||
                window.location.hostname === "127.0.0.1";

            let hasServiceWorker = false;
            if ("serviceWorker" in navigator) {
                try {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    hasServiceWorker = registrations.length > 0;
                    setSwRegistered(hasServiceWorker);
                } catch (error) {
                    console.error("[PWA] Error checking service worker:", error);
                    return false;
                }
            }

            const criteria = { hasManifest, hasServiceWorker, isHttps };
            setPwaCriteria(criteria);

            console.log("[PWA] Criteria check:", criteria);
            console.log("[PWA] Installed check:", checkIfInstalled());

            // If criteria not met, try to register service worker
            if (!hasServiceWorker && "serviceWorker" in navigator) {
                try {
                    console.log("[PWA] Registering service worker...");
                    const registration = await navigator.serviceWorker.register("/sw.js", {
                        scope: "/",
                    });
                    console.log("[PWA] Service worker registered:", registration);
                    setSwRegistered(true);
                    setPwaCriteria({ ...criteria, hasServiceWorker: true });

                    // Wait for service worker to be ready
                    await navigator.serviceWorker.ready;
                    console.log("[PWA] Service worker ready");
                } catch (error) {
                    console.error("[PWA] Error registering service worker:", error);
                    return false;
                }
            }

            return hasServiceWorker && hasManifest && isHttps;
        };

        console.log("[PWA] Initial check...");
        if (checkIfInstalled()) {
            console.log("[PWA] App is already installed");
            return;
        }

        // Check if user has dismissed the prompt recently (within 7 days)
        const dismissedUntil = localStorage.getItem(STORAGE_DISMISSED_UNTIL);
        if (dismissedUntil) {
            const dismissedDate = new Date(dismissedUntil);
            if (dismissedDate > new Date()) {
                console.log("[PWA] Prompt dismissed until:", dismissedUntil);
                return; // Still in dismiss period
            } else {
                // Expired, clear it
                localStorage.removeItem(STORAGE_DISMISSED_UNTIL);
                localStorage.removeItem(STORAGE_KEY);
            }
        }

        // Check if user has permanently dismissed
        const permanentlyDismissed = localStorage.getItem(STORAGE_KEY);
        if (permanentlyDismissed === "true") {
            console.log("[PWA] Prompt permanently dismissed");
            return;
        }

        // Check if we already have a deferred prompt stored globally
        if (typeof window !== "undefined" && window.deferredPrompt) {
            console.log("[PWA] Found existing deferred prompt in global storage");
            setDeferredPrompt(window.deferredPrompt as BeforeInstallPromptEvent);
            setShowPrompt(true);
        }

        // Listen for the beforeinstallprompt event
        const handleBeforeInstallPrompt = (e: Event) => {
            console.log("[PWA] beforeinstallprompt event fired!", e);
            e.preventDefault();

            const promptEvent = e as BeforeInstallPromptEvent;

            // Store globally in case component unmounts
            if (typeof window !== "undefined") {
                window.deferredPrompt = promptEvent;
            }

            setDeferredPrompt(promptEvent);
            setShowPrompt(true);
        };
        
        // Set up global handler before component-specific one
        if (typeof window !== "undefined") {
            window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        }
        // setTimeout(() => {
        //     handleBeforeInstallPrompt(new Event("beforeinstallprompt"));
        // }, 1000);

        // Also listen for app installed event to hide prompt if user installs via browser UI
        const handleAppInstalled = () => {
            console.log("[PWA] App installed event fired");
            setIsInstalled(true);
            setShowPrompt(false);
            setDeferredPrompt(null);
            if (typeof window !== "undefined") {
                window.deferredPrompt = null;
            }
        };
        
        if (typeof window !== "undefined") {
            window.addEventListener("appinstalled", handleAppInstalled);
        }

        return () => {
            if (typeof window !== "undefined") {
                window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
                window.removeEventListener("appinstalled", handleAppInstalled);
            }
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        setIsInstalling(true);

        try {
            // Show the install prompt
            await deferredPrompt.prompt();

            // Wait for the user to respond to the prompt
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === "accepted") {
                console.log("User accepted the install prompt");
                setIsInstalled(true);
                setShowPrompt(false);
            } else {
                console.log("User dismissed the install prompt");
            }

            // Clear the deferred prompt
            setDeferredPrompt(null);
        } catch (error) {
            console.error("Error showing install prompt:", error);
        } finally {
            setIsInstalling(false);
        }
    };

    const handleDismiss = (permanent: boolean = false) => {
        setShowPrompt(false);
        if (permanent) {
            localStorage.setItem(STORAGE_KEY, "true");
        } else {
            // Dismiss for 7 days
            const dismissedUntil = new Date();
            dismissedUntil.setDate(dismissedUntil.getDate() + 7);
            localStorage.setItem(STORAGE_DISMISSED_UNTIL, dismissedUntil.toISOString());
        }
        setDeferredPrompt(null);
    };

    // Debug logging
    useEffect(() => {
        console.log("[PWA] State:", {
            isInstalled,
            showPrompt,
            hasDeferredPrompt: !!deferredPrompt,
            isInstalling,
            swRegistered,
            pwaCriteria,
        });
    }, [isInstalled, showPrompt, deferredPrompt, isInstalling, swRegistered, pwaCriteria]);

    // Don't show if already installed or no prompt available
    if (isInstalled || !showPrompt || !deferredPrompt || isInstalling) {
        // if (isInstalled || isInstalling || !swRegistered || !pwaCriteria.hasServiceWorker) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4 transition-opacity duration-200">
            <Card
                variant="elevated"
                className="w-full max-w-md transform transition-all duration-300 ease-out"
            >
                <CardBody className="p-6">
                    <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className="flex-shrink-0">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                                <Download className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <Typography
                                variant="h5"
                                className="mb-1 !text-gray-900 dark:!text-white"
                            >
                                Install DriveBetter
                            </Typography>
                            <Typography
                                variant="body2"
                                className="!text-gray-600 dark:!text-gray-300 mb-3"
                            >
                                Install our app to access DriveBetter faster and use it offline. Get
                                quick access from your home screen!
                            </Typography>
                        </div>

                        {/* Close button */}
                        <button
                            onClick={() => handleDismiss(false)}
                            className="flex-shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            aria-label="Dismiss"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </CardBody>

                <CardFooter className="px-6 pb-6 pt-0 flex flex-col sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDismiss(false)}
                        className="w-full sm:w-auto order-2 sm:order-1"
                    >
                        Maybe later
                    </Button>
                    <Button
                        variant="solid"
                        colorScheme="primary"
                        size="sm"
                        onClick={handleInstall}
                        disabled={isInstalling}
                        loading={isInstalling}
                        leftIcon={<Download className="h-4 w-4" />}
                        className="w-full sm:w-auto order-1 sm:order-2"
                    >
                        {isInstalling ? "Installing..." : "Install App"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
