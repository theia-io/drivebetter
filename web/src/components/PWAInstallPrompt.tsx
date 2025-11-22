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

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);

    useEffect(() => {
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

        if (checkIfInstalled()) {
            return;
        }

        // Check if user has dismissed the prompt recently (within 7 days)
        const dismissedUntil = localStorage.getItem(STORAGE_DISMISSED_UNTIL);
        if (dismissedUntil) {
            const dismissedDate = new Date(dismissedUntil);
            if (dismissedDate > new Date()) {
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
            return;
        }

        // Listen for the beforeinstallprompt event
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setShowPrompt(true);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

        // Also listen for app installed event to hide prompt if user installs via browser UI
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setShowPrompt(false);
            setDeferredPrompt(null);
        };

        window.addEventListener("appinstalled", handleAppInstalled);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleAppInstalled);
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

    // Don't show if already installed or no prompt available
    if (isInstalled || !showPrompt || !deferredPrompt) {
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
                            <Typography variant="h5" className="mb-1 !text-gray-900 dark:!text-white">
                                Install DriveBetter
                            </Typography>
                            <Typography variant="body2" className="!text-gray-600 dark:!text-gray-300 mb-3">
                                Install our app to access DriveBetter faster and use it offline. Get quick access from your home screen!
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

