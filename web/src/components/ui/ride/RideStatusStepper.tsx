"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import {
    type RideStatus,
    STATUS_FLOW,
    getStatusColors,
    getStatusLabel,
    getStatusIcon,
} from "@/types/rideStatus";

type RideStatusStepperProps = {
    value: RideStatus;
    className?: string;
};

export default function RideStatusStepper({
                                              value,
                                              className,
                                          }: RideStatusStepperProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const activeRef = useRef<HTMLDivElement | null>(null);

    const idx = STATUS_FLOW.indexOf(value);
    const currentIndex = idx === -1 ? 0 : idx;

    // auto-scroll so current step is brought into view (useful on mobile)
    useEffect(() => {
        const container = containerRef.current;
        const active = activeRef.current;
        if (!container || !active) return;

        const containerRect = container.getBoundingClientRect();
        const activeRect = active.getBoundingClientRect();

        const offset =
            activeRect.left -
            containerRect.left -
            containerRect.width / 2 +
            activeRect.width / 2;

        container.scrollBy({
            left: offset,
            behavior: "smooth",
        });
    }, [currentIndex]);

    return (
        <div className={["w-full", className].filter(Boolean).join(" ")}>
            <div
                ref={containerRef}
                className="
          flex items-center gap-2
          overflow-x-auto no-scrollbar
          sm:overflow-visible sm:justify-between
          py-1
        "
            >
                {STATUS_FLOW.map((status, idx) => {
                    const isCompleted = currentIndex > idx;
                    const isCurrent = currentIndex === idx;
                    const Icon = getStatusIcon(status);
                    const colors = getStatusColors(status);
                    const label = getStatusLabel(status);

                    const circleBase =
                        "flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full shrink-0 border";
                    let circleClass = circleBase;
                    const circleStyle: CSSProperties = {};

                    if (isCurrent) {
                        circleClass += " border-2";
                        circleStyle.backgroundColor = colors.bg;
                        circleStyle.borderColor = colors.border;
                    } else if (isCompleted) {
                        circleStyle.backgroundColor = colors.bg;
                        circleStyle.borderColor = colors.border;
                    } else {
                        circleStyle.backgroundColor = "#f9fafb"; // gray-50
                        circleStyle.borderColor = "#e5e7eb"; // gray-200
                    }

                    const iconColor =
                        isCurrent || isCompleted ? colors.text : "#9ca3af"; // gray-400

                    const lineStyle: CSSProperties = {
                        backgroundColor: isCompleted ? colors.border : "#e5e7eb",
                    };

                    return (
                        <div
                            key={status}
                            className="flex items-center flex-shrink-0 sm:flex-1"
                            ref={isCurrent ? activeRef : undefined}
                        >
                            <div className="flex flex-col items-center">
                                <div className={circleClass} style={circleStyle}>
                                    <Icon
                                        className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                                        style={{ color: iconColor }}
                                    />
                                </div>
                                <div className="mt-1 text-[9px] uppercase tracking-wide text-gray-600 max-w-[3.25rem] text-center leading-tight">
                                    {label}
                                </div>
                            </div>

                            {idx < STATUS_FLOW.length - 1 && (
                                <>
                                    {/* Mobile / small screens: short fixed connector */}
                                    <div
                                        className="h-0.5 w-6 mx-1 rounded-full sm:hidden"
                                        style={lineStyle}
                                    />
                                    {/* Desktop: connector stretches to fill remaining width */}
                                    <div
                                        className="hidden sm:block h-0.5 mx-2 rounded-full flex-1"
                                        style={lineStyle}
                                    />
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
