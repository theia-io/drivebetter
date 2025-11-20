"use client";
import { Button } from "@/components/ui";
import { useEffect, useState } from "react";

export default function InstallPrompt({ className }: { className?: string }) {
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);

        setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
    }, []);

    if (isStandalone) {
        return null; // Don't show install button if already installed
    }

    return (
        <div className={className}>
            {isIOS && (
                <>
                    <h3 className="text-lg font-bold">Install App: Add to Home Screen</h3>

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
                </>
            )}
        </div>
    );
}
