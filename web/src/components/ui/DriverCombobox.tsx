// web/ui/src/components/drivers/DriverCombobox.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Car } from "lucide-react";
import {type DriverPublic, useDriversPublic} from "@/stores/users";

export default function DriverCombobox({
                                           id,
                                           valueEmail,
                                           onChange,
                                           error,
                                       }: {
    id?: string;
    valueEmail: string;
    onChange: (driver: DriverPublic | null) => void;
    error?: string;
}) {
    const { data } = useDriversPublic();
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const listRef = useRef<HTMLDivElement | null>(null);

    const drivers = data || [];
    const selected = useMemo(
        () => drivers.find((d) => d.email === valueEmail) || null,
        [drivers, valueEmail]
    );

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return drivers;
        return drivers.filter((d) => d.name.toLowerCase().includes(q));
    }, [drivers, query]);

    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            if (!open) return;
            const t = e.target as Node;
            if (inputRef.current?.contains(t)) return;
            if (listRef.current?.contains(t)) return;
            setOpen(false);
        }
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, [open]);

    const showAll = () => {
        setQuery("");
        setOpen(true);
    };

    return (
        <div className="relative">
            <div className="flex">
                <input
                    id={id}
                    ref={inputRef}
                    type="text"
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={`${id}-list`}
                    aria-autocomplete="list"
                    value={selected ? selected.name : query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        onChange(null);
                        setOpen(true);
                    }}
                    onFocus={showAll}
                    placeholder="Start typing driver name"
                    className={inputClass(error)}
                />
            </div>

            {open && (
                <div
                    ref={listRef}
                    id={`${id}-list`}
                    role="listbox"
                    className="absolute z-10 mt-2 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg"
                >
                    {filtered.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">No drivers</div>
                    ) : (
                        filtered.map((d) => (
                            <button
                                type="button"
                                key={d.email}
                                role="option"
                                aria-selected={d.email === valueEmail}
                                onClick={() => {
                                    onChange(d);
                                    setQuery(d.name);
                                    setOpen(false);
                                }}
                                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50"
                            >
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100">
                                    <Car className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                                </div>
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-medium text-gray-900">
                                        {d.name}
                                    </div>
                                    <div className="truncate text-xs text-gray-500">{d.email}</div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            )}

            {selected && (
                <div className="mt-1 text-xs text-gray-600">
                    Selected: {selected.name} ({selected.email})
                </div>
            )}
        </div>
    );
}

function inputClass(error?: string) {
    return [
        "w-full rounded-lg border px-3 py-2.5 text-sm sm:text-base",
        "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
        error ? "border-red-300" : "border-gray-300",
    ].join(" ");
}
