"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, User } from "lucide-react";
import { apiPost } from "@/services/http";
import type { EligibleDriver, EligibleDriverBody } from "@/types";
import { inputClass } from "@/components/ui/commmon";

type AssignDriverSelectProps = {
    rideId: string;
    /** currently assigned driver (if any) */
    currentDriverId?: string | null;
    /** optional filters forwarded to /driver-details/eligible */
    filters?: Partial<EligibleDriverBody>;
    /** called after successful assignment */
    onAssigned?: (driverUserId: string) => void;
    /** extra classes for wrapper */
    className?: string;
    /** optional label text */
    label?: string;
    /** disable interactions */
    disabled?: boolean;
};

export default function AssignDriverSelect({
                                               rideId,
                                               currentDriverId,
                                               filters,
                                               onAssigned,
                                               className = "",
                                               label = "Assign driver",
                                               disabled = false,
                                           }: AssignDriverSelectProps) {
    const [drivers, setDrivers] = useState<EligibleDriver[]>([]);
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selected, setSelected] = useState<string>(currentDriverId || "");

    // keep selected in sync when parent changes assigned driver
    useEffect(() => {
        setSelected(currentDriverId || "");
    }, [currentDriverId]);

    // load eligible drivers once (or when filters change)
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const body: EligibleDriverBody = {
                    limit: filters?.limit ?? 50,
                    passengers: filters?.passengers,
                    luggages: filters?.luggages,
                    vehicleType: filters?.vehicleType,
                    language: filters?.language,
                    needs: filters?.needs,
                    airportTrip: filters?.airportTrip,
                    longDistance: filters?.longDistance,
                };

                const res = await apiPost<EligibleDriver[]>("/driver-details/eligible", body);
                if (cancelled) return;
                setDrivers(res || []);
            } catch (e: any) {
                if (cancelled) return;
                setError(e?.message || "Failed to load drivers");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [filters?.airportTrip, filters?.language, filters?.limit, filters?.luggages, filters?.longDistance, filters?.needs, filters?.passengers, filters?.vehicleType]);

    const isBusy = loading || assigning || disabled;

    const options = useMemo(() => {
        return drivers.map((d) => {
            const v = d.vehicle || {};
            const parts: string[] = [];

            if (d.user?.name) parts.push(d.user.name);
            if (v.type) parts.push(v.type.toUpperCase());
            const car = [v.make, v.model].filter(Boolean).join(" ");
            if (car) parts.push(car);
            if (v.plate) parts.push(`(${v.plate})`);
            if (d.stats?.ratingAvg && d.stats.ratingCount) {
                parts.push(`★${d.stats.ratingAvg.toFixed(1)} (${d.stats.ratingCount})`);
            }

            const label = parts.join(" • ") || d.userId;
            return { id: d.userId, label };
        });
    }, [drivers]);

    async function handleAssign(driverUserId: string) {
        if (!driverUserId || driverUserId === selected) return;
        setAssigning(true);
        setError(null);
        try {
            await apiPost(`/rides/${rideId}/assign`, { driverId: driverUserId });
            setSelected(driverUserId);
            onAssigned?.(driverUserId);
        } catch (e: any) {
            setError(e?.message || "Failed to assign driver");
            // roll back selection visually
            setSelected(currentDriverId || "");
        } finally {
            setAssigning(false);
        }
    }

    const handleChange: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
        const next = e.target.value;
        setSelected(next);
        if (next) {
            void handleAssign(next);
        }
    };

    return (
        <div className={`space-y-1 ${className}`}>
            <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-700 uppercase tracking-wide flex items-center gap-1">
          <User className="w-3 h-3 text-gray-500" />
            {label}
        </span>
                {loading && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
            </div>

            <select
                value={selected}
                onChange={handleChange}
                disabled={isBusy || options.length === 0}
                className={inputClass() + " text-xs sm:text-sm"}
            >
                <option value="">{options.length ? "Select driver…" : "No drivers available"}</option>
                {options.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                        {opt.label}
                    </option>
                ))}
            </select>

            {assigning && (
                <div className="text-[11px] text-gray-500 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Assigning…
                </div>
            )}

            {error && <div className="text-[11px] text-red-600">{error}</div>}
        </div>
    );
}
