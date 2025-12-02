"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
    STATUS_OPTIONS,
    getStatusColors,
    getStatusDotColor,
    getStatusLabel,
    type RideStatus,
} from "@/types/rideStatus";
import { cn } from "@/utils/css";

type RideStatusDropdownProps = {
    rideStatus: RideStatus;
    possibleStatuses: RideStatus[];
    onChange?: (next: RideStatus) => Promise<void> | void;
    disabled?: boolean;
    className?: string;
};

export default function RideStatusDropdown({
    rideStatus,
    possibleStatuses,
    onChange,
    disabled,
    className,
}: RideStatusDropdownProps) {
    const [open, setOpen] = useState(false);

    const currentStatus = STATUS_OPTIONS.find((s) => s.value === rideStatus);
    const label = currentStatus?.label ?? getStatusLabel(rideStatus);
    const desc = currentStatus?.description ?? "Tap to update the ride status.";
    const colors = getStatusColors(rideStatus);

    async function handleSelect(next: RideStatus) {
        setOpen(false);

        if (next === rideStatus) return;
        if (onChange) {
            await onChange(next);
        }
    }

    return (
        <div className={["relative z-1000", className].filter(Boolean).join(" ")}>
            {/* Trigger */}
            <button
                type="button"
                onClick={() => !disabled && setOpen((v) => !v)}
                disabled={disabled}
                style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                }}
                className={[
                    "flex w-full items-center justify-between rounded-lg border px-3 py-3",
                    "text-left text-sm shadow-sm transition-[filter]",
                    disabled
                        ? "opacity-70 cursor-not-allowed"
                        : "cursor-pointer hover:brightness-95",
                ].join(" ")}
            >
                <div className="flex min-w-0 items-start gap-3">
                    <span
                        className={[
                            "mt-1 h-2 w-2 rounded-full flex-shrink-0",
                            getStatusDotColor(rideStatus),
                        ].join(" ")}
                    />
                    <div className="min-w-0 flex flex-col">
                        <span className="text-sm font-semibold text-gray-900">{label}</span>
                        <span className="text-xs text-gray-800/80 leading-snug">{desc}</span>
                    </div>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-gray-700" />
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 z-[1100] mt-1 w-full rounded-lg border border-gray-100 bg-white shadow-lg">
                    <div className="border-b border-gray-100 px-3 py-2">
                        <p className="text-xs font-semibold text-gray-900">Change ride status</p>
                        <p className="text-[11px] text-gray-500">
                            Choose the option that best reflects current progress.
                        </p>
                    </div>
                    <ul className="max-h-80 overflow-y-auto py-1 text-sm">
                        {STATUS_OPTIONS.map((opt) => {
                            const isActive = opt.value === rideStatus;
                            const dotClass = getStatusDotColor(opt.value);
                            const optColors = getStatusColors(opt.value);
                            const possibleToChange = possibleStatuses.includes(opt.value);

                            return (
                                <li key={opt.value}>
                                    <button
                                        type="button"
                                        onClick={() => handleSelect(opt.value)}
                                        disabled={!possibleToChange}
                                        style={
                                            isActive ? { backgroundColor: optColors.bg } : undefined
                                        }
                                        className={cn(
                                            "flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-gray-50",
                                            isActive ? "bg-gray-50/80" : "",
                                            !possibleToChange ? "opacity-50 cursor-not-allowed" : ""
                                        )}
                                    >
                                        <span
                                            className={[
                                                "mt-1 h-2 w-2 rounded-full flex-shrink-0",
                                                dotClass,
                                            ].join(" ")}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-sm font-semibold text-gray-900">
                                                    {opt.label}
                                                </span>

                                                {isActive && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-gray-900 border border-black/5">
                                                        <Check className="h-3 w-3" />
                                                        Current
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-0.5 text-xs text-gray-600 leading-snug">
                                                {opt.description}
                                            </p>
                                        </div>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}
