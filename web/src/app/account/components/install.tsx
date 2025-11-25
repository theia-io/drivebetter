"use client";
import { usePWA } from "@/services/pwa";

export default function InstallPrompt({ className }: { className?: string }) {
    const { isIOS, isStandalone } = usePWA();

    if (isStandalone) {
        return null; // Don't show install button if already installed
    }

    return (
        isIOS && (
            <div className={className}>
                <h3 className="text-lg font-bold">To install the app: Add to Home Screen</h3>

                <p>
                    To install this app on your iOS device, tap the share button
                    <span role="img" aria-label="share icon">
                        {" "}
                        ⎋{" "}
                    </span>
                    and then &apos;Add to Home Screen&apos;
                    <span role="img" aria-label="plus icon">
                        {" "}
                        ➕{" "}
                    </span>
                    .
                </p>
            </div>
        )
    );
}
