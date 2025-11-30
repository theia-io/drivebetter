"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2, Search, User } from "lucide-react";
import { apiPost } from "@/services/http";
import type { EligibleDriver, EligibleDriverBody } from "@/types";

type AssignDriverSelectProps = {
    rideId: string;
    currentDriverId?: string | null;
    filters?: Partial<EligibleDriverBody>;
    onAssigned?: (driverUserId: string) => void;
    className?: string;
    label?: string;
    disabled?: boolean;
};

type DriverOption = {
    id: string;
    main: string;
    helper?: string;
};

export default function AssignDriverSelect({
                                               rideId,
                                               currentDriverId,
                                               filters,
                                               onAssigned,
                                               className = "",
                                               label = "Driver",
                                               disabled,
                                           }: AssignDriverSelectProps) {
    const [drivers, setDrivers] = useState<EligibleDriver[]>([]);
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedDriverId, setSelectedDriverId] = useState<string>(currentDriverId ?? "");
    const [pendingDriverId, setPendingDriverId] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);

    const rootRef = useRef<HTMLDivElement | null>(null);

    // keep in sync with external currentDriverId
    useEffect(() => {
        setSelectedDriverId(currentDriverId ?? "");
        if (!currentDriverId) {
            setPendingDriverId(null);
        }
    }, [currentDriverId]);

    // close on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (!rootRef.current) return;
            if (!rootRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }

        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [open]);

    // load eligible drivers
    useEffect(() => {
        if (disabled) return;

        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);
            try {
                const body: EligibleDriverBody = {
                    limit: 50,
                    ...(filters || {}),
                } as EligibleDriverBody;

                const result = await apiPost("/driver-details/eligible", body);

                const list: EligibleDriver[] = Array.isArray(result)
                    ? result
                    : Array.isArray((result as any)?.data)
                        ? (result as any).data
                        : [];

                if (!cancelled) {
                    setDrivers(list);
                }
            } catch (e: any) {
                if (!cancelled) {
                    setError(e?.message || "Failed to load drivers");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void load();

        return () => {
            cancelled = true;
        };
    }, [filters, disabled]);

    const options: DriverOption[] = useMemo(() => {
        return drivers.map((d) => {
            const v: any = (d as any).vehicle || {};
            const user = (d as any).user || {};

            const main =
                (user.name as string) ||
                [user.firstName, user.lastName].filter(Boolean).join(" ") ||
                ((d as any).userId as string);

            const helperParts: string[] = [];

            if (v.type) helperParts.push(String(v.type).toUpperCase());

            const car = [v.make, v.model].filter(Boolean).join(" ");
            if (car) helperParts.push(car);

            if (v.plate) helperParts.push(`(${v.plate})`);

            const stats = (d as any).stats;
            if (stats?.ratingAvg && stats?.ratingCount) {
                const avg = Number(stats.ratingAvg).toFixed(1);
                const cnt = stats.ratingCount;
                helperParts.push(`★${avg} (${cnt})`);
            }

            const helper = helperParts.length > 0 ? helperParts.join(" • ") : undefined;

            return {
                id: (d as any).userId as string,
                main,
                helper,
            };
        });
    }, [drivers]);

    const filteredOptions = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return options;

        return options.filter((opt) => {
            if (opt.main.toLowerCase().includes(q)) return true;
            if (opt.helper && opt.helper.toLowerCase().includes(q)) return true;
            return false;
        });
    }, [options, search]);

    const selectedOption = useMemo(() => {
        return options.find((o) => o.id === selectedDriverId) || null;
    }, [options, selectedDriverId]);

    // when opening, pre-select current driver
    useEffect(() => {
        if (!open) return;
        setPendingDriverId((prev) => prev || selectedDriverId || null);
    }, [open, selectedDriverId]);

    async function handleAssign() {
        if (!pendingDriverId || pendingDriverId === selectedDriverId) return;

        setAssigning(true);
        setError(null);

        try {
            await apiPost(`/rides/${rideId}/assign`, { driverId: pendingDriverId });
            setSelectedDriverId(pendingDriverId);
            if (onAssigned) onAssigned(pendingDriverId);
            setOpen(false);
        } catch (e: any) {
            setError(e?.message || "Failed to assign driver");
        } finally {
            setAssigning(false);
        }
    }

    const isBusy = !!disabled || loading || assigning;

    return (
        <div
            ref={rootRef}
            className={[
                "relative flex flex-col sm:flex-row items-stretch sm:items-start gap-1.5 sm:gap-2",
                className,
            ].join(" ")}
        >
            {/* Label row – stacked on mobile, inline on desktop */}
            <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-700">
                {/*<User className="h-3 w-3 text-gray-500" />*/}
                {/*<span>{label}</span>*/}
                {loading && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
            </div>

            {/* Trigger button with main + helper text */}
            <div className="relative inline-block flex-1 text-left">
                <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setOpen((prev) => !prev)}
                    className={[
                        "inline-flex h-10 w-full items-center justify-between rounded-lg border px-3 text-xs sm:text-sm",
                        "bg-white border-gray-300 text-gray-900",
                        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                        isBusy ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                    ].join(" ")}
                >
                    <span className="flex min-w-0 flex-col text-left">
                        <span className="truncate">
                            {selectedOption?.main || "Select driver"}
                        </span>
                        {selectedOption?.helper && (
                            <span className="truncate text-[11px] text-gray-500">
                                {selectedOption.helper}
                            </span>
                        )}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
                </button>

                {open && (
                    <div
                        className={[
                            // full-width under trigger on mobile, constrained on larger screens
                            "absolute left-0 right-0 z-40 mt-2 w-full sm:max-w-md",
                            "origin-top rounded-lg border border-gray-100 bg-white shadow-lg",
                        ].join(" ")}
                    >
                        {/* Search bar */}
                        <div className="border-b border-gray-100 p-3">
                            <label htmlFor={`driver-search-${rideId}`} className="sr-only">
                                Search driver
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    id={`driver-search-${rideId}`}
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search driver"
                                    autoComplete="off"
                                    className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 pl-9 text-xs sm:text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Options list with main + helper text */}
                        <div className="max-h-60 overflow-y-auto py-1 text-sm text-gray-700">
                            {filteredOptions.length === 0 && (
                                <div className="px-4 py-2 text-xs text-gray-500">
                                    No drivers found
                                </div>
                            )}

                            {filteredOptions.map((opt) => {
                                const isSelected =
                                    opt.id === pendingDriverId ||
                                    (!pendingDriverId && opt.id === selectedDriverId);

                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setPendingDriverId(opt.id)}
                                        className={[
                                            "flex w-full items-start px-4 py-2 text-left",
                                            "hover:bg-gray-100",
                                            isSelected ? "bg-gray-100" : "",
                                        ].join(" ")}
                                    >
                                        <div className="flex min-w-0 flex-col">
                                            <span className="truncate text-xs sm:text-sm font-medium text-gray-900">
                                                {opt.main}
                                            </span>
                                            {opt.helper && (
                                                <span className="truncate text-[11px] text-gray-500">
                                                    {opt.helper}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Footer with full-width Assign button (no extra helper text) */}
                        <div className="border-t border-gray-100 px-3 py-2">
                            <button
                                type="button"
                                onClick={handleAssign}
                                disabled={!pendingDriverId || assigning}
                                className={[
                                    "inline-flex w-full items-center justify-center rounded-lg px-3 py-2.5 text-xs sm:text-sm font-medium",
                                    !pendingDriverId || assigning
                                        ? "cursor-not-allowed bg-blue-400 text-white opacity-70"
                                        : "bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500",
                                ].join(" ")}
                            >
                                {assigning && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Assign
                            </button>
                        </div>
                    </div>
                )}

                {error && <div className="mt-1 text-[11px] text-red-600">{error}</div>}
            </div>
        </div>
    );
}
