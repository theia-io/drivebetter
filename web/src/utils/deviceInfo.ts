/**
 * Collects non-invasive device information for push notification subscriptions
 * Privacy-compliant: Only collects technical info needed for notification delivery
 */

export interface DeviceInfo {
    // Basic device type
    deviceType: "mobile" | "desktop" | "tablet" | "unknown";
    
    // Browser info
    browser: {
        name: string;
        version: string;
        vendor?: string;
    };
    
    // OS info
    os: {
        name: string;
        version?: string;
    };
    
    // Display info (non-exact, privacy-safe)
    display: {
        width: number;
        height: number;
        pixelRatio: number;
    };
    
    // User agent (already sent by browser)
    userAgent: string;
    
    // Locale/timezone (for notification timing)
    locale: string;
    timezone: string;
    timezoneOffset: number;
    
    // PWA status
    isPWA: boolean;
    isStandalone: boolean;
    
    // Connection info (helpful for notification delivery)
    connectionType?: "cellular" | "wifi" | "ethernet" | "unknown";
    effectiveType?: "2g" | "3g" | "4g" | "slow-2g" | "unknown";
    
    // Notification support
    notificationPermission: NotificationPermission | "unsupported";
    
    // Timestamp
    collectedAt: string;
}

/**
 * Detects device type based on user agent and screen size
 */
function detectDeviceType(): "mobile" | "desktop" | "tablet" | "unknown" {
    if (typeof window === "undefined") return "unknown";
    
    const ua = navigator.userAgent.toLowerCase();
    const width = window.screen.width;
    const height = window.screen.height;
    
    // Tablet detection
    if (
        /ipad|android/.test(ua) && !/mobile/.test(ua) ||
        (width >= 768 && width < 1024 && /touch/.test(ua))
    ) {
        return "tablet";
    }
    
    // Mobile detection
    if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/.test(ua)) {
        return "mobile";
    }
    
    // Desktop (default)
    if (width >= 1024) {
        return "desktop";
    }
    
    return "unknown";
}

/**
 * Detects browser name and version
 */
function detectBrowser(): { name: string; version: string; vendor?: string } {
    if (typeof window === "undefined") {
        return { name: "unknown", version: "unknown" };
    }
    
    const ua = navigator.userAgent;
    let name = "unknown";
    let version = "unknown";
    const vendor = navigator.vendor || undefined;
    
    if (ua.includes("Chrome") && !ua.includes("Edg") && !ua.includes("OPR")) {
        name = "Chrome";
        const match = ua.match(/Chrome\/(\d+)/);
        version = match ? match[1] : "unknown";
    } else if (ua.includes("Firefox")) {
        name = "Firefox";
        const match = ua.match(/Firefox\/(\d+)/);
        version = match ? match[1] : "unknown";
    } else if (ua.includes("Safari") && !ua.includes("Chrome")) {
        name = "Safari";
        const match = ua.match(/Version\/(\d+)/);
        version = match ? match[1] : "unknown";
    } else if (ua.includes("Edg")) {
        name = "Edge";
        const match = ua.match(/Edg\/(\d+)/);
        version = match ? match[1] : "unknown";
    } else if (ua.includes("OPR")) {
        name = "Opera";
        const match = ua.match(/OPR\/(\d+)/);
        version = match ? match[1] : "unknown";
    }
    
    return { name, version, vendor };
}

/**
 * Detects operating system
 */
function detectOS(): { name: string; version?: string } {
    if (typeof window === "undefined") {
        return { name: "unknown" };
    }
    
    const ua = navigator.userAgent;
    let name = "unknown";
    let version: string | undefined = undefined;
    
    if (ua.includes("Windows")) {
        name = "Windows";
        if (ua.includes("Windows NT 10.0")) version = "10";
        else if (ua.includes("Windows NT 6.3")) version = "8.1";
        else if (ua.includes("Windows NT 6.2")) version = "8";
        else if (ua.includes("Windows NT 6.1")) version = "7";
    } else if (ua.includes("Mac OS X") || ua.includes("Macintosh")) {
        name = "macOS";
        const match = ua.match(/Mac OS X (\d+)[._](\d+)/);
        if (match) version = `${match[1]}.${match[2]}`;
    } else if (ua.includes("Linux")) {
        name = "Linux";
    } else if (ua.includes("Android")) {
        name = "Android";
        const match = ua.match(/Android (\d+(?:\.\d+)?)/);
        if (match) version = match[1];
    } else if (ua.includes("iPhone") || ua.includes("iPad")) {
        name = ua.includes("iPad") ? "iPadOS" : "iOS";
        const match = ua.match(/OS (\d+)[._](\d+)/);
        if (match) version = `${match[1]}.${match[2]}`;
    }
    
    return { name, version };
}

/**
 * Gets connection info if available (Network Information API)
 */
function getConnectionInfo(): {
    connectionType?: "cellular" | "wifi" | "ethernet" | "unknown";
    effectiveType?: "2g" | "3g" | "4g" | "slow-2g" | "unknown";
} {
    if (typeof window === "undefined") return {};
    
    const nav = navigator as any;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    
    if (!connection) return {};
    
    return {
        connectionType: connection.type || connection.effectiveType || undefined,
        effectiveType: connection.effectiveType || undefined,
    };
}

/**
 * Checks if app is installed as PWA
 */
function checkPWAStatus(): { isPWA: boolean; isStandalone: boolean } {
    if (typeof window === "undefined") {
        return { isPWA: false, isStandalone: false };
    }
    
    const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
    
    // Check if service worker is registered (indicator of PWA)
    const isPWA = isStandalone || "serviceWorker" in navigator;
    
    return { isPWA, isStandalone };
}

/**
 * Gets notification permission status
 */
function getNotificationPermission(): NotificationPermission | "unsupported" {
    if (typeof window === "undefined" || !("Notification" in window)) {
        return "unsupported";
    }
    return Notification.permission;
}

/**
 * Collects device information in a privacy-compliant manner
 * Only collects technical data needed for notification delivery and device management
 */
export function collectDeviceInfo(): DeviceInfo {
    if (typeof window === "undefined") {
        // Return minimal info for SSR
        return {
            deviceType: "unknown",
            browser: { name: "unknown", version: "unknown" },
            os: { name: "unknown" },
            display: { width: 0, height: 0, pixelRatio: 1 },
            userAgent: "unknown",
            locale: "en",
            timezone: "UTC",
            timezoneOffset: 0,
            isPWA: false,
            isStandalone: false,
            notificationPermission: "unsupported",
            collectedAt: new Date().toISOString(),
        };
    }
    
    const browser = detectBrowser();
    const os = detectOS();
    const deviceType = detectDeviceType();
    const connection = getConnectionInfo();
    const pwa = checkPWAStatus();
    
    return {
        deviceType,
        browser,
        os,
        display: {
            width: window.screen.width,
            height: window.screen.height,
            pixelRatio: window.devicePixelRatio || 1,
        },
        userAgent: navigator.userAgent,
        locale: navigator.language || navigator.languages?.[0] || "en",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        timezoneOffset: new Date().getTimezoneOffset(),
        isPWA: pwa.isPWA,
        isStandalone: pwa.isStandalone,
        connectionType: connection.connectionType,
        effectiveType: connection.effectiveType,
        notificationPermission: getNotificationPermission(),
        collectedAt: new Date().toISOString(),
    };
}

/**
 * Generates a friendly device name for display
 */
export function generateDeviceName(deviceInfo: DeviceInfo): string {
    const parts: string[] = [];
    
    if (deviceInfo.deviceType !== "unknown") {
        parts.push(deviceInfo.deviceType.charAt(0).toUpperCase() + deviceInfo.deviceType.slice(1));
    }
    
    if (deviceInfo.browser.name !== "unknown") {
        parts.push(deviceInfo.browser.name);
    }
    
    if (deviceInfo.os.name !== "unknown") {
        parts.push(deviceInfo.os.name);
    }
    
    return parts.length > 0 ? parts.join(" - ") : "Unknown Device";
}

