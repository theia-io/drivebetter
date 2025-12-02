"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2, Search, User } from "lucide-react";

type CustomerRecord = {
    user?: {
        _id?: string;
        name?: string;
        email?: string;
        phone?: string;
    };
    profile?: {
        _id?: string;
    };
};

type CustomerSelectProps = {
    customers: CustomerRecord[];
    currentCustomerId?: string | null;
    label?: string;
    disabled?: boolean;
    className?: string;
    onSelected?: (payload: {
        customerUserId: string | null;
        name?: string;
        email?: string;
        phone?: string;
    }) => void;
};

type CustomerOption = {
    id: string;
    main: string;
    helper?: string;
    email?: string;
    phone?: string;
};

const NONE_ID = "__NONE__";

export default function CustomerSelect({
                                           customers,
                                           currentCustomerId,
                                           label = "Customer",
                                           disabled,
                                           className = "",
                                           onSelected,
                                       }: CustomerSelectProps) {
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
        currentCustomerId ?? "",
    );
    const [pendingCustomerId, setPendingCustomerId] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false); // kept for visual parity with AssignDriverSelect
    const [error, setError] = useState<string | null>(null);

    const rootRef = useRef<HTMLDivElement | null>(null);

    // sync with external prop
    useEffect(() => {
        setSelectedCustomerId(currentCustomerId ?? "");
        if (!currentCustomerId) {
            setPendingCustomerId(null);
        }
    }, [currentCustomerId]);

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

    const options: CustomerOption[] = useMemo(() => {
        return customers
            .map((c) => {
                const u = c.user || {};
                const id = (u._id as string) || (c.profile?._id as string) || "";
                if (!id) return null;

                const main = (u.name as string) || (u.email as string) || "Customer";

                const helperParts: string[] = [];
                if (u.email) helperParts.push(String(u.email));
                if (u.phone) helperParts.push(String(u.phone));
                const helper = helperParts.length ? helperParts.join(" • ") : undefined;

                return {
                    id,
                    main,
                    helper,
                    email: u.email as string | undefined,
                    phone: u.phone as string | undefined,
                };
            })
            .filter(Boolean) as CustomerOption[];
    }, [customers]);

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
        return options.find((o) => o.id === selectedCustomerId) || null;
    }, [options, selectedCustomerId]);

    // when opening, pre-select current
    useEffect(() => {
        if (!open) return;
        setPendingCustomerId((prev) => prev || selectedCustomerId || null);
    }, [open, selectedCustomerId]);

    const isBusy = !!disabled || loading;

    function handleConfirm() {
        if (!pendingCustomerId && pendingCustomerId !== NONE_ID) return;

        setError(null);

        if (pendingCustomerId === NONE_ID) {
            setSelectedCustomerId("");
            if (onSelected) {
                onSelected({
                    customerUserId: null,
                    // do not touch current name/phone; parent keeps its own values
                });
            }
            setOpen(false);
            return;
        }

        const opt = options.find((o) => o.id === pendingCustomerId);
        if (!opt) return;

        setSelectedCustomerId(opt.id);
        if (onSelected) {
            onSelected({
                customerUserId: opt.id,
                name: opt.main,
                email: opt.email,
                phone: opt.phone,
            });
        }
        setOpen(false);
    }

    const triggerLabel = selectedOption
        ? selectedOption.main
        : "Not linked / ad-hoc client";

    const triggerHelper =
        selectedOption?.helper ||
        (selectedOption ? undefined : "Link to an invited customer (optional)");

    return (
        <div
            ref={rootRef}
            className={[
                "relative flex flex-col sm:flex-row items-stretch sm:items-start gap-1.5 sm:gap-2",
                className,
            ].join(" ")}
        >
            {/* Label row */}
            <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-700">
                <User className="h-3 w-3 text-gray-500" />
                <span>{label}</span>
                {loading && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
            </div>

            {/* Trigger button */}
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
                        <span className="truncate">{triggerLabel}</span>
                        {triggerHelper && (
                            <span className="truncate text-[11px] text-gray-500">
                                {triggerHelper}
                            </span>
                        )}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
                </button>

                {open && (
                    <div
                        className={[
                            "absolute left-0 right-0 z-40 mt-2 w-full sm:max-w-md",
                            "origin-top rounded-lg border border-gray-100 bg-white shadow-lg",
                        ].join(" ")}
                    >
                        {/* Search bar */}
                        <div className="border-b border-gray-100 p-3">
                            <label className="sr-only" htmlFor="customer-search">
                                Search customer
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    id="customer-search"
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search customer"
                                    autoComplete="off"
                                    className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 pl-9 text-xs sm:text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Options */}
                        <div className="max-h-60 overflow-y-auto py-1 text-sm text-gray-700">
                            {/* None / ad-hoc */}
                            <button
                                type="button"
                                onClick={() => setPendingCustomerId(NONE_ID)}
                                className={[
                                    "flex w-full items-start px-4 py-2 text-left hover:bg-gray-100",
                                    pendingCustomerId === NONE_ID
                                        ? "bg-gray-100"
                                        : "",
                                ].join(" ")}
                            >
                                <div className="flex min-w-0 flex-col">
                                    <span className="truncate text-xs sm:text-sm font-medium text-gray-900">
                                        Not linked / ad-hoc client
                                    </span>
                                    <span className="truncate text-[11px] text-gray-500">
                                        Keep client details only in this ride
                                    </span>
                                </div>
                            </button>

                            {filteredOptions.length === 0 && (
                                <div className="px-4 py-2 text-xs text-gray-500">
                                    No customers found
                                </div>
                            )}

                            {filteredOptions.map((opt) => {
                                const isSelected =
                                    opt.id === pendingCustomerId ||
                                    (!pendingCustomerId &&
                                        opt.id === selectedCustomerId);

                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setPendingCustomerId(opt.id)}
                                        className={[
                                            "flex w-full items-start px-4 py-2 text-left hover:bg-gray-100",
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

                        {/* Footer with Select button */}
                        <div className="border-t border-gray-100 px-3 py-2">
                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={
                                    (!pendingCustomerId && pendingCustomerId !== NONE_ID) ||
                                    isBusy
                                }
                                className={[
                                    "inline-flex w-full items-center justify-center rounded-lg px-3 py-2.5 text-xs sm:text-sm font-medium",
                                    (!pendingCustomerId &&
                                        pendingCustomerId !== NONE_ID) ||
                                    isBusy
                                        ? "cursor-not-allowed bg-blue-400 text-white opacity-70"
                                        : "bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500",
                                ].join(" ")}
                            >
                                {loading && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Select
                            </button>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mt-1 text-[11px] text-red-600">{error}</div>
                )}
            </div>
        </div>
    );
}
