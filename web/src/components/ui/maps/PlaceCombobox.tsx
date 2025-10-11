"use client";
import { useEffect, useRef, useState } from "react";
import { searchPlaces, type PlaceHit } from "@/stores/geocode";

type Props = {
    id?: string;
    value?: string;                     // optional initial text
    onSelectedChange: (hit: PlaceHit | null) => void; // fires only on pick/clear
    error?: string;
    placeholder?: string;
};

export default function PlaceCombobox({
                                          id,
                                          value = "",
                                          onSelectedChange,
                                          error,
                                          placeholder,
                                      }: Props) {
    const [q, setQ] = useState(value);
    const [open, setOpen] = useState(false);
    const [hits, setHits] = useState<PlaceHit[]>([]);
    const [selected, setSelected] = useState<PlaceHit | null>(null); // internal selection
    const inputRef = useRef<HTMLInputElement | null>(null);
    const listRef = useRef<HTMLDivElement | null>(null);
    const t = useRef<ReturnType<typeof setTimeout> | null>(null);

    // fetch suggestions
    useEffect(() => {
        if (t.current) clearTimeout(t.current);
        if (!q.trim()) {
            setHits([]);
            setOpen(false);
            return;
        }
        t.current = setTimeout(async () => {
            try {
                const res = await searchPlaces(q);
                setHits(res);
                setOpen(res.length > 0);
            } catch {
                setHits([]);
                setOpen(false);
            }
        }, 200);
        return () => {
            if (t.current) clearTimeout(t.current);
        };
    }, [q]);

    // close on outside click
    useEffect(() => {
        function onDoc(e: MouseEvent) {
            const n = e.target as Node;
            if (inputRef.current?.contains(n)) return;
            if (listRef.current?.contains(n)) return;
            setOpen(false);
        }
        if (open) document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [open]);

    // typing clears previous selection (so map will hide upstream)
    function handleInputChange(next: string) {
        setQ(next);
        if (selected) {
            setSelected(null);
            onSelectedChange(null);
        }
    }

    function handlePick(hit: PlaceHit) {
        setSelected(hit);
        onSelectedChange(hit);
        setQ(hit.label);      // lock text to chosen label
        setOpen(false);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Escape") setOpen(false);
        // Optional: Enter-to-pick first result if none selected
        if (e.key === "Enter" && !selected && hits.length > 0) {
            e.preventDefault();
            handlePick(hits[0]);
        }
    }

    return (
        <div className="relative">
            <input
                id={id}
                ref={inputRef}
                value={q}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => setOpen(hits.length > 0)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder || "Start typing address or city"}
                className={inputClass(error)}
                role="combobox"
                aria-expanded={open}
                aria-controls={id ? `${id}-listbox` : undefined}
                aria-autocomplete="list"
            />
            {open && hits.length > 0 && (
                <div
                    ref={listRef}
                    id={id ? `${id}-listbox` : undefined}
                    role="listbox"
                    className="absolute z-10 mt-2 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg"
                >
                    {hits.map((h) => (
                        <button
                            key={`${h.lon},${h.lat},${h.label}`}
                            type="button"
                            role="option"
                            aria-selected={selected?.label === h.label}
                            onClick={() => handlePick(h)}
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                        >
                            {h.label}
                        </button>
                    ))}
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
