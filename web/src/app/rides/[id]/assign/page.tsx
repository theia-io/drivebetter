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
            console.log("searching");
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
                <div className="mt-4 grid grid-cols-1 gap-3 max-w-3xl">
                    {eligible.map((d) => {
                        const v = d.vehicle || {};
                        const label = [
                            v.type?.toUpperCase(),
                            [v.make, v.model].filter(Boolean).join(" "),
                            v.plate ? `(${v.plate})` : "",
                            d.stats?.ratingAvg ? `★${d.stats.ratingAvg.toFixed(1)}` : "",
                        ]
                            .filter(Boolean)
                            .join(" • ");

                        return (
                            <Card key={d.userId} variant="elevated" className="hover:shadow-lg transition-shadow">
                                <CardBody className="p-4 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="font-medium text-gray-900 truncate">{label || d.userId}</div>
                                        <div className="text-xs text-gray-600">
                                            Max passengers: {d.capacity?.maxPassengers ?? "—"}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            leftIcon={<CheckCircle className="w-4 h-4" />}
                                            onClick={() => assignDriver(d.userId)}
                                        >
                                            Assign
                                        </Button>
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