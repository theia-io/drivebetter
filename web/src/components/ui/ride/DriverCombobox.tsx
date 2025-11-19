// components/ui/ride/DriverCombobox.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, UserIcon } from "lucide-react";
import { Button } from "@/components/ui";
import { useDriversPublic, type DriverPublic } from "@/stores/users";

export type SimpleDriver = {
    id: string;
    name?: string;
    email?: string;
};

const toStr = (v: any) => String(v ?? "");

// Common props
type BaseProps = {
    id?: string;
    label?: string;
    placeholder?: string;
    error?: string;
    className?: string;
    disabled?: boolean;
    // Optional action button under dropdown
    actionLabel?: string;
    actionHint?: string;
    onAction?: (drivers: SimpleDriver[]) => void;
    actionDisabled?: boolean;
};

type SingleProps = BaseProps & {
    mode?: "single";
    value: SimpleDriver | null;
    values?: never;
    onChange: (driver: SimpleDriver | null) => void;
};

type MultiProps = BaseProps & {
    mode: "multi";
    values: SimpleDriver[];
    value?: never;
    onChange: (drivers: SimpleDriver[]) => void;
};

export type DriverComboboxProps = SingleProps | MultiProps;

export function DriverCombobox(props: DriverComboboxProps) {
    const {
        id,
        label = "Drivers",
        placeholder = "Select drivers",
        error,
        className = "",
        disabled,
        actionLabel,
        actionHint,
        onAction,
        actionDisabled,
    } = props;

    const isMulti = props.mode === "multi";

    const { data: driversData = [], isLoading } = useDriversPublic();
    const drivers = driversData as DriverPublic[];

    const items: SimpleDriver[] = useMemo(
        () =>
            drivers.map((d: any) => ({
                id: toStr(d._id || d.id || d.userId),
                name: d.name,
                email: d.email,
            })),
        [drivers]
    );

    const itemsById = useMemo(() => {
        const map = new Map<string, SimpleDriver>();
        for (const it of items) map.set(it.id, it);
        return map;
    }, [items]);

    // selected IDs derived from props
    const selectedIds = useMemo(() => {
        if (isMulti) {
            return new Set(props.values.map((d) => d.id));
        }
        const single = (!isMulti && props.value) || null;
        return new Set(single ? [single.id] : []);
    }, [isMulti, props]);

    const selectedDrivers: SimpleDriver[] = useMemo(() => {
        const arr: SimpleDriver[] = [];
        // @ts-ignore
        for (const id of selectedIds) {
            const d = itemsById.get(id);
            if (d) arr.push(d);
        }
        return arr;
    }, [selectedIds, itemsById]);

    const selectedCount = selectedDrivers.length;

    const selectedLabel =
        selectedCount === 0
            ? placeholder
            : isMulti
              ? `${selectedCount} driver${selectedCount > 1 ? "s" : ""} selected`
              : selectedDrivers[0]?.name || selectedDrivers[0]?.email || placeholder;

    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const rootRef = useRef<HTMLDivElement | null>(null);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter((d) => {
            const name = toStr(d.name).toLowerCase();
            const email = toStr(d.email).toLowerCase();
            return name.includes(q) || email.includes(q);
        });
    }, [items, search]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;

        function handleClick(e: MouseEvent) {
            if (!rootRef.current) return;
            if (!rootRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    // Reset search on close
    useEffect(() => {
        if (!open) setSearch("");
    }, [open]);

    const hasError = !!error;
    const isDisabled = !!disabled || isLoading;

    function toggleSelection(id: string) {
        const driver = itemsById.get(id);
        if (!driver) return;

        if (isMulti) {
            const current = props.values;
            const exists = current.some((d) => d.id === id);
            const next = exists ? current.filter((d) => d.id !== id) : [...current, driver];
            props.onChange(next);
        } else {
            const already = selectedIds.has(id);
            const next = already ? null : driver;
            props.onChange(next);
            setOpen(false);
        }
    }

    function handleActionClick() {
        if (!onAction) return;
        if (!selectedDrivers.length) return;
        onAction(selectedDrivers);
    }

    return (
        <div className={["w-full", className].join(" ")}>
            {label && <div className="mb-1 text-xs font-medium text-gray-700">{label}</div>}

            <div ref={rootRef} className="relative inline-block w-full text-left">
                {/* Trigger */}
                <button
                    type="button"
                    id={id}
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    disabled={isDisabled}
                    onClick={() => {
                        if (isDisabled) return;
                        setOpen((prev) => !prev);
                    }}
                    className={[
                        "inline-flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs sm:text-sm",
                        "bg-white text-gray-900",
                        "focus:outline-none focus:ring-2 focus:ring-indigo-500",
                        hasError ? "border-red-300" : "border-gray-300 focus:border-indigo-500",
                        isDisabled ? "cursor-not-allowed opacity-60" : "",
                    ].join(" ")}
                >
                    <span className="flex flex-col text-left">
                        <span className="truncate font-medium">{selectedLabel}</span>
                        <span className="truncate text-[11px] text-gray-500">
                            {isLoading ? "Loading drivers…" : "Search by name or email"}
                        </span>
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                </button>

                {/* Dropdown panel */}
                {open && (
                    <div
                        className="absolute z-40 mt-2 w-full rounded-lg border border-gray-100 bg-white shadow-lg"
                        role="listbox"
                        aria-labelledby={id}
                    >
                        {/* Search */}
                        <div className="border-b border-gray-100 p-2">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search drivers…"
                                    className="w-full rounded-md border border-gray-200 bg-gray-50 pl-7 pr-2 py-1.5 text-xs sm:text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        {/* Options list */}
                        <div className="max-h-56 overflow-y-auto py-1 text-xs sm:text-sm">
                            {isLoading && (
                                <div className="px-3 py-2 text-[11px] text-gray-500">
                                    Loading drivers…
                                </div>
                            )}

                            {!isLoading && filtered.length === 0 && (
                                <div className="px-3 py-2 text-[11px] text-gray-500">
                                    No drivers found.
                                </div>
                            )}

                            {!isLoading &&
                                filtered.map((d) => {
                                    const id = toStr(
                                        (d as any)._id || (d as any).id || (d as any).userId
                                    );
                                    const isSelected = selectedIds.has(id);

                                    return (
                                        <button
                                            type="button"
                                            key={id}
                                            role="option"
                                            aria-selected={isSelected}
                                            onClick={() => toggleSelection(id)}
                                            className={[
                                                "flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50",
                                                isSelected ? "bg-gray-50" : "",
                                            ].join(" ")}
                                        >
                                            <input
                                                type={isMulti ? "checkbox" : "radio"}
                                                readOnly
                                                checked={isSelected}
                                                className="h-3 w-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <div className="flex flex-col">
                                                <span className="truncate text-gray-900">
                                                    {d.name || d.email || `User ${id.slice(-6)}`}
                                                </span>
                                                {d.email && (
                                                    <span className="text-[11px] text-gray-500">
                                                        {d.email}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                        </div>

                        {/* Optional action button */}
                        {onAction && (
                            <div className="border-t border-gray-100 px-3 py-2 space-y-1">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="w-full justify-center px-3 py-1.5 text-xs sm:text-sm"
                                    disabled={
                                        selectedCount === 0 ||
                                        !!actionDisabled ||
                                        isLoading ||
                                        disabled
                                    }
                                    onClick={handleActionClick}
                                >
                                    {actionLabel || "Apply to selected drivers"}
                                </Button>
                                {actionHint && (
                                    <div className="text-[11px] text-gray-500">{actionHint}</div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Selected tags for multi mode */}
            {isMulti && selectedDrivers.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                    {selectedDrivers.map((d) => (
                        <span
                            key={d.id}
                            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px]"
                        >
                            <UserIcon className="h-3 w-3 text-gray-500" />
                            <span className="truncate max-w-[8rem]">
                                {d.name || d.email || `User ${d.id.slice(-6)}`}
                            </span>
                        </span>
                    ))}
                </div>
            )}

            {error && <div className="mt-1 text-[11px] text-red-600">{error}</div>}
        </div>
    );
}
