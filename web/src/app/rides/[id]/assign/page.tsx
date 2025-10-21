"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import { ArrowLeft, CheckCircle, Search } from "lucide-react";
import { useRide } from "@/stores/rides";
import { apiPost } from "@/services/http";
import type { VehicleType } from "@/types/driver-details";
import { Field, FieldLabel, inputClass } from "@/components/ui/commmon";
import {EligibleDriver} from "@/types";

function initials(name?: string) {
    if (!name) return "DR";
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map(p => p[0]?.toUpperCase()).join("");
}

function timeAgo(d?: string | Date | null) {
    if (!d) return "—";
    const t = typeof d === "string" ? new Date(d) : d;
    const secs = Math.max(0, Math.floor((Date.now() - t.getTime()) / 1000));
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

function Pill({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs bg-white">
      {children}
    </span>
    );
}

function Tag({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center rounded-md bg-gray-100 text-gray-800 border border-gray-200 px-2 py-0.5 text-[11px]">
      {children}
    </span>
    );
}

function RatingStars({ value = 0 }: { value?: number }) {
    const full = Math.floor(value);
    const half = value - full >= 0.25 && value - full < 0.75;
    const stars = Array.from({ length: 5 }).map((_, i) => {
        if (i < full) return "★";
        if (i === full && half) return "☆"; // pseudo half; keep it simple
        return "☆";
    });
    return (
        <span className="font-medium tracking-tight text-yellow-600" title={`${value.toFixed(1)} / 5`}>
      {stars.join("")}
    </span>
    );
}

export default function AssignDriverPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const sp = useSearchParams();

    const { data: ride } = useRide(id);

    // Prefill filters from querystring
    const [passengers, setPassengers] = useState<number>(Number(sp.get("passengers") || 1));
    const [luggageLiters, setLuggageLiters] = useState<number>(Number(sp.get("luggageLiters") || 0));
    const [vehicleType, setVehicleType] = useState<VehicleType | "">((sp.get("vehicleType") as VehicleType) || "");
    const [language, setLanguage] = useState<string>(sp.get("language") || "");
    const [airportTrip, setAirportTrip] = useState<boolean>(sp.get("airportTrip") === "1");
    const [longDistance, setLongDistance] = useState<boolean>(sp.get("longDistance") === "1");

    const [loading, setLoading] = useState(false);
    const [eligible, setEligible] = useState<EligibleDriver[]>([]);
    const [error, setError] = useState<string | null>(null);

    const header = useMemo(() => (ride ? `${ride.from} → ${ride.to}` : "Assign driver"), [ride]);

    async function findEligible() {
        setEligible([]);
        setError(null);
        setLoading(true);
        try {
            // No location filtering for now per your request
            const body: any = {
                passengers,
                vehicleType: vehicleType || undefined,
                needs: {
                    pet: false, // add switches here if needed
                    babySeat: false,
                    wheelchair: false,
                },
                language: language || undefined,
                airportTrip,
                longDistance,
                limit: 50,
            };

            const res = await apiPost<EligibleDriver[]>("/driver-details/eligible", body);
            setEligible(res || []);
        } catch (e: any) {
            setError(e?.message || "Failed to load eligible drivers");
        } finally {
            setLoading(false);
        }
    }

    async function assignDriver(driverUserId: string) {
        try {
            await apiPost(`/rides/${id}/assign`, { driverId: driverUserId });
            router.push(`/rides/${id}`);
        } catch (e: any) {
            alert(e?.message || "Failed to assign");
        }
    }

    return (
        <ProtectedLayout>
            <Container className="px-4 sm:px-6 lg:px-8">
                <div className="flex items-center mb-6 sm:mb-8">
                    <Button
                        type="button"
                        variant="outline"
                        leftIcon={<ArrowLeft className="w-4 h-4" />}
                        onClick={() => router.push(`/rides/${id}`)}
                        className="mr-3"
                    >
                        Back
                    </Button>
                    <div className="min-w-0">
                        <Typography variant="h1" className="text-2xl sm:text-3xl font-bold truncate">
                            Assign driver
                        </Typography>
                        {ride && (
                            <Typography variant="body1" className="text-gray-600 text-sm sm:text-base">
                                {header}
                            </Typography>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <Card variant="elevated" className="max-w-3xl">
                    <CardBody className="p-4 sm:p-6 space-y-4">
                        <Typography className="text-sm font-medium text-gray-900">Filters</Typography>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Field>
                                <FieldLabel htmlFor="passengers">Passengers</FieldLabel>
                                <input
                                    id="passengers"
                                    type="number"
                                    min={1}
                                    value={passengers}
                                    onChange={(e) => setPassengers(Number(e.target.value || 1))}
                                    className={inputClass()}
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="vehicleType">Vehicle Type</FieldLabel>
                                <select
                                    id="vehicleType"
                                    value={vehicleType}
                                    onChange={(e) => setVehicleType(e.target.value as VehicleType | "")}
                                    className={inputClass()}
                                >
                                    <option value="">Any</option>
                                    <option value="sedan">Sedan</option>
                                    <option value="suv">SUV</option>
                                    <option value="van">Van</option>
                                    <option value="wagon">Wagon</option>
                                    <option value="hatchback">Hatchback</option>
                                    <option value="pickup">Pickup</option>
                                    <option value="other">Other</option>
                                </select>
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="language">Language</FieldLabel>
                                <input
                                    id="language"
                                    type="text"
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className={inputClass()}
                                    placeholder='ISO 639-1 (e.g., "en")'
                                />
                            </Field>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <label className="inline-flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={airportTrip}
                                    onChange={(e) => setAirportTrip(e.target.checked)}
                                />
                                Airport trip
                            </label>
                            <label className="inline-flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={longDistance}
                                    onChange={(e) => setLongDistance(e.target.checked)}
                                />
                                Long distance
                            </label>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                leftIcon={<Search className="w-4 h-4" />}
                                onClick={findEligible}
                                disabled={loading}
                            >
                                {loading ? "Searching…" : "Find eligible drivers"}
                            </Button>
                            {error && <div className="text-sm text-red-600">{error}</div>}
                            {!loading && !error && eligible.length > 0 && (
                                <div className="text-sm text-gray-600">{eligible.length} found</div>
                            )}
                        </div>
                    </CardBody>
                </Card>

                {/* Results */}
                <div className="mt-4 grid grid-cols-1 gap-3 max-w-4xl">
                    {eligible.map((d) => {
                        const user = d.user || {};
                        const v = d.vehicle || {};
                        const cap = d.capacity || {};
                        const feats = d.features || {};
                        const langs = d.languages || {};
                        const prefs = d.preferences || {};
                        const stats = d.stats || {};

                        const vehicleLabel = [v.type?.toUpperCase(), [v.make, v.model].filter(Boolean).join(" "), v.year, v.plate ? `(${v.plate})` : ""]
                            .filter(Boolean)
                            .join(" • ");

                        return (
                            <Card key={d.userId} variant="elevated" className="hover:shadow-lg transition-shadow">
                                <CardBody className="p-4 sm:p-5">
                                    <div className="flex items-start gap-3 sm:gap-4">
                                        {/* Avatar */}
                                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center shrink-0">
              <span className="text-indigo-700 text-sm sm:text-base font-bold">
                {((user as any).name ? (user as any).name[0] : "D").toUpperCase()}
              </span>
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            {/* Top row: name + contact + rating */}
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="text-gray-900 font-semibold truncate">
                                                        {(user as any).name || `Driver ${String(d.userId).slice(-6)}`}
                                                    </div>
                                                    <div className="text-xs text-gray-600 truncate">
                                                        {(user as any).email || "—"}
                                                    </div>
                                                </div>

                                                {stats && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        {typeof stats.ratingAvg === "number" && (
                                                            <div className="flex items-center gap-1 text-yellow-600 font-medium">
                                                                ★ {stats.ratingAvg.toFixed(1)}
                                                                <span className="text-xs text-gray-500">({stats.ratingCount ?? 0})</span>
                                                            </div>
                                                        )}
                                                        {typeof stats.completedRides === "number" && (
                                                            <span className="text-xs text-gray-600">Rides: {stats.completedRides}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Vehicle & capacity */}
                                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-700">
                                                {vehicleLabel && (
                                                    <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5">
                    {vehicleLabel}
                  </span>
                                                )}
                                                {typeof cap.maxPassengers === "number" && (
                                                    <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5">
                    Max pax: {cap.maxPassengers}
                  </span>
                                                )}
                                                {typeof cap.luggageCapacityLiters === "number" && (
                                                    <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5">
                    Luggage: {cap.luggageCapacityLiters} L
                  </span>
                                                )}
                                                {v.color && (
                                                    <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5">
                    Color: {v.color}
                  </span>
                                                )}
                                            </div>

                                            {/* Features / preferences / languages */}
                                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                                {/* Features */}
                                                <div>
                                                    <div className="font-medium text-gray-600 mb-1">Features</div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {feats.petFriendly && <Tag>Pet-friendly</Tag>}
                                                        {feats.babySeat && <Tag>Baby seat</Tag>}
                                                        {feats.wheelchairAccessible && <Tag>Wheelchair</Tag>}
                                                        {!feats.petFriendly && !feats.babySeat && !feats.wheelchairAccessible && (
                                                            <span className="text-gray-400">—</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Preferences */}
                                                <div>
                                                    <div className="font-medium text-gray-600 mb-1">Preferences</div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {prefs.airportPermit && <Tag>Airport permit</Tag>}
                                                        {prefs.longDistance && <Tag>Long distance</Tag>}
                                                        {!prefs.airportPermit && !prefs.longDistance && (
                                                            <span className="text-gray-400">—</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Languages */}
                                                <div>
                                                    <div className="font-medium text-gray-600 mb-1">Languages</div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {langs.primary && <Tag>{langs.primary}</Tag>}
                                                        {(langs.list ?? []).map((lng) => (
                                                            <Tag key={lng}>{lng}</Tag>
                                                        ))}
                                                        {!langs.primary && !(langs.list ?? []).length && <span className="text-gray-400">—</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                            <Button
                                                size="sm"
                                                leftIcon={<CheckCircle className="w-4 h-4" />}
                                                onClick={() => assignDriver(d.userId)}
                                            >
                                                Assign
                                            </Button>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        );
                    })}

                    {!loading && !error && eligible.length === 0 && (
                        <Card variant="elevated">
                            <CardBody className="p-4 text-sm text-gray-600">
                                No results yet. Adjust filters and click <em>Find eligible drivers</em>.
                            </CardBody>
                        </Card>
                    )}
                </div>

            </Container>
        </ProtectedLayout>
    );
}