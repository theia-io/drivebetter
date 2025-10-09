"use client";
import { useEffect, useRef, useState } from "react";
import { searchPlaces, type PlaceHit } from "@/stores/geocode";

export default function PlaceCombobox({
                                          id, value, onSelect, error, placeholder,
                                      }: {
    id?: string; value: string; onSelect: (hit: PlaceHit)=>void; error?: string; placeholder?: string;
}) {
    const [q, setQ] = useState(value);
    const [open, setOpen] = useState(false);
    const [hits, setHits] = useState<PlaceHit[]>([]);
    const inputRef = useRef<HTMLInputElement|null>(null);
    const listRef = useRef<HTMLDivElement|null>(null);
    const t = useRef<ReturnType<typeof setTimeout>|null>(null);

    useEffect(() => {
        if (t.current) clearTimeout(t.current);
        if (!q.trim()) { setHits([]); setOpen(false); return; }
        t.current = setTimeout(async () => {
            try { setHits(await searchPlaces(q)); setOpen(true); } catch { setHits([]); setOpen(false); }
        }, 200);
        return () => { if (t.current) clearTimeout(t.current); };
    }, [q]);

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

    return (
        <div className="relative">
            <input
                id={id}
                ref={inputRef}
                value={q}
                onChange={(e)=>setQ(e.target.value)}
                onFocus={()=>setOpen(hits.length>0)}
                placeholder={placeholder || "Start typing address or city"}
                className={inputClass(error)}
            />
            {open && hits.length > 0 && (
                <div
                    ref={listRef}
                    role="listbox"
                    className="absolute z-10 mt-2 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg"
                >
                    {hits.map((h) => (
                        <button
                            key={`${h.lon},${h.lat},${h.label}`}
                            type="button"
                            role="option"
                            onClick={() => { onSelect(h); setQ(h.label); setOpen(false); }}
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
