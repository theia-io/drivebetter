"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import { ArrowLeft, Save } from "lucide-react";
import PlaceCombobox from "@/components/ui/maps/PlaceCombobox";
import LeafletMap from "@/components/ui/maps/LeafletMap";
import { createRide } from "@/stores/rides";
import { PlaceHit } from "@/stores/geocode";
import { getRoute } from "@/stores/routes";
import { currentHourTimeInput, todayDateInput } from "@/services/datetime";
import { VehicleType } from "@/types/driver-details";
import { RideStatus, RideType } from "@/types/ride";
import { Field, FieldLabel, FieldError, inputClass } from "@/components/ui/commmon";

/* ------------------------------- Types ------------------------------- */

interface RideFormValues {
    clientId?: string;
    fromLabel: string;
    toLabel: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:mm
    type: RideType | "";
    status: RideStatus;
    notes: string;
    coveredVisible: boolean;

    // Filters to pass to assignment step
    passengers?: number;
    luggages?: number;
    vehicleType?: VehicleType | "";
    language?: string;
    airportTrip?: boolean;
    longDistance?: boolean;
}

/* ----------------------------- Initial State ----------------------------- */

const initialValues: RideFormValues = {
    clientId: undefined,
    fromLabel: "",
    toLabel: "",
    date: todayDateInput(),
    time: currentHourTimeInput(),
    type: "",
    status: "unassigned",
    notes: "",
    coveredVisible: true,

    // defaults for stage 2
    passengers: 1,
    luggages: 0,
    vehicleType: "",
    language: "",
    airportTrip: false,
    longDistance: false,
};

export default function NewRidePage() {
    const router = useRouter();
    const [values, setValues] = useState<RideFormValues>(initialValues);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [pickupHit, setPickupHit] = useState<PlaceHit | null>(null);
    const [destHit, setDestHit] = useState<PlaceHit | null>(null);
    const [routeLine, setRouteLine] = useState<[number, number][]>([]);
    const [distanceMeters, setDistanceMeters] = useState<number>(0);
    const [durationMinutes, setDurationMinutes] = useState<number>(0);

    const set = <K extends keyof RideFormValues>(k: K, v: RideFormValues[K]) =>
        setValues((prev) => ({ ...prev, [k]: v }));

    const validate = (v: RideFormValues) => {
        const e: Record<string, string> = {};
        if (!v.fromLabel.trim()) e.fromLabel = "Pickup is required";
        if (!v.toLabel.trim()) e.toLabel = "Destination is required";
        if (!v.date) e.date = "Date is required";
        if (!v.time) e.time = "Time is required";
        if (!pickupHit) e.fromLabel = "Select a pickup from suggestions";
        if (!destHit) e.toLabel = "Select a destination from suggestions";
        return e;
    };

    const onSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        const e = validate(values);
        setErrors(e);
        if (Object.keys(e).length) return;

        setSubmitting(true);
        try {
            const iso = new Date(`${values.date}T${values.time}:00`).toISOString();

            // Stage 1: create UNASSIGNED ride (no assignedDriverId here)
            const payload: any = {
                clientId: values.clientId || undefined,
                from: values.fromLabel,
                to: values.toLabel,
                datetime: iso,
                type: values.type || undefined,
                status: "unassigned",
                notes: values.notes,
                coveredVisible: values.coveredVisible,
                distance: distanceMeters,
                fromLocation: pickupHit
                    ? { type: "Point", coordinates: [pickupHit.lon, pickupHit.lat] }
                    : undefined,
                toLocation: destHit
                    ? { type: "Point", coordinates: [destHit.lon, destHit.lat] }
                    : undefined,
            };

            const created = await createRide(payload); // IMPORTANT: await
            if (created?._id) {
                // Pass filters in the querystring to the assignment page
                const sp = new URLSearchParams();
                if (values.passengers) sp.set("passengers", String(values.passengers));
                if (values.luggages) sp.set("luggages", String(values.luggages));
                if (values.vehicleType) sp.set("vehicleType", String(values.vehicleType));
                if (values.language) sp.set("language", values.language);
                if (values.airportTrip) sp.set("airportTrip", "1");
                if (values.longDistance) sp.set("longDistance", "1");

                router.push(`/rides/${created._id}/assign?${sp.toString()}`);
            } else {
                alert("Ride created but response missing ID.");
                router.push("/rides");
            }
        } catch (err) {
            console.error(err);
            alert("Failed to create ride.");
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!pickupHit || !destHit) {
                setRouteLine([]);
                setDistanceMeters(0);
                setDurationMinutes(0);
                return;
            }
            const r = await getRoute([pickupHit.lon, pickupHit.lat], [destHit.lon, destHit.lat]);
            if (cancelled) return;
            setRouteLine(r.geometry);
            setDistanceMeters(r.distanceMeters);
            setDurationMinutes(Math.round(r.durationSeconds / 60));
        })();
        return () => {
            cancelled = true;
        };
    }, [pickupHit, destHit]);

    return (
        <ProtectedLayout>
            <Container className="px-4 sm:px-6 lg:px-8">
                <div className="flex items-center mb-6 sm:mb-8">
                    <Button
                        type="button"
                        variant="outline"
                        leftIcon={<ArrowLeft className="w-4 h-4" />}
                        onClick={() => router.back()}
                        className="mr-3"
                    >
                        Back
                    </Button>
                    <div>
                        <Typography variant="h1" className="text-2xl sm:text-3xl font-bold">
                            New Ride
                        </Typography>
                        <Typography variant="body1" className="text-gray-600 text-sm sm:text-base">
                            Stage 1: Create the ride (assign driver later)
                        </Typography>
                    </div>
                </div>

                <Card variant="elevated" className="max-w-3xl">
                    <CardBody className="p-4 sm:p-6">
                        <form onSubmit={onSubmit} className="space-y-6" noValidate>
                            {/* Client (optional) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field>
                                    <FieldLabel htmlFor="client">Client (optional)</FieldLabel>
                                    <input
                                        id="client"
                                        type="text"
                                        value={values.clientId || ""}
                                        onChange={(e) => set("clientId", e.target.value)}
                                        className={inputClass()}
                                        placeholder="Client name / phone / ID"
                                    />
                                </Field>

                                {/* Filters you want to persist to next step */}
                                <Field>
                                    <FieldLabel htmlFor="passengers">Passengers</FieldLabel>
                                    <input
                                        id="passengers"
                                        type="number"
                                        min={1}
                                        value={values.passengers ?? 1}
                                        onChange={(e) => set("passengers", Number(e.target.value || 1))}
                                        className={inputClass()}
                                    />
                                </Field>
                            </div>

                            {/* More filters (optional) */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Field>
                                    <FieldLabel htmlFor="luggages">Luggage</FieldLabel>
                                    <input
                                        id="luggages"
                                        type="number"
                                        min={0}
                                        value={values.luggages ?? 0}
                                        onChange={(e) => set("luggages", Number(e.target.value || 0))}
                                        className={inputClass()}
                                    />
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="vehicleType">Vehicle Type</FieldLabel>
                                    <select
                                        id="vehicleType"
                                        value={values.vehicleType || ""}
                                        onChange={(e) => set("vehicleType", e.target.value as VehicleType | "")}
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
                                    <FieldLabel htmlFor="lang">Preferred language</FieldLabel>
                                    <input
                                        id="lang"
                                        type="text"
                                        value={values.language || ""}
                                        onChange={(e) => set("language", e.target.value)}
                                        className={inputClass()}
                                        placeholder='ISO 639-1 (e.g., "en")'
                                    />
                                </Field>
                            </div>

                            {/* Flags */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <label className="inline-flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={values.airportTrip ?? false}
                                        onChange={(e) => set("airportTrip", e.target.checked)}
                                    />
                                    Airport trip
                                </label>
                                <label className="inline-flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={values.longDistance ?? false}
                                        onChange={(e) => set("longDistance", e.target.checked)}
                                    />
                                    Long distance
                                </label>
                            </div>

                            {/* Where */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field>
                                    <FieldLabel htmlFor="pickup">Pickup</FieldLabel>
                                    <PlaceCombobox
                                        id="pickup"
                                        value={values.fromLabel}
                                        onSelectedChange={(hit) => {
                                            if (hit) {
                                                set("fromLabel", hit.label);
                                                setPickupHit(hit);
                                            } else {
                                                setPickupHit(null);
                                            }
                                        }}
                                        error={errors.fromLabel}
                                    />
                                    <FieldError message={errors.fromLabel} />
                                    {pickupHit && (
                                        <div className="mt-2">
                                            <LeafletMap
                                                heightClass="h-56"
                                                center={[pickupHit.lon, pickupHit.lat]}
                                                markerA={[pickupHit.lon, pickupHit.lat]}
                                                markerALabel={pickupHit.label}
                                            />
                                        </div>
                                    )}
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="destination">Destination</FieldLabel>
                                    <PlaceCombobox
                                        id="destination"
                                        value={values.toLabel}
                                        onSelectedChange={(hit) => {
                                            if (hit) {
                                                set("toLabel", hit.label);
                                                setDestHit(hit);
                                            } else {
                                                setDestHit(null);
                                            }
                                        }}
                                        error={errors.toLabel}
                                    />
                                    <FieldError message={errors.toLabel} />
                                    {destHit && (
                                        <div className="mt-2">
                                            <LeafletMap
                                                heightClass="h-56"
                                                center={[destHit.lon, destHit.lat]}
                                                markerA={[destHit.lon, destHit.lat]}
                                                markerALabel={destHit.label}
                                            />
                                        </div>
                                    )}
                                </Field>
                            </div>

                            {/* Route preview */}
                            {pickupHit && destHit && (
                                <div className="mt-2">
                                    <LeafletMap
                                        heightClass="h-64"
                                        markerA={[pickupHit.lon, pickupHit.lat]}
                                        markerALabel="A"
                                        markerB={[destHit.lon, destHit.lat]}
                                        markerBLabel="B"
                                        routeLine={routeLine}
                                    />
                                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
                                        <div>Distance: {(distanceMeters / 1000).toFixed(1)} km</div>
                                        <div>Duration: {durationMinutes} min</div>
                                    </div>
                                </div>
                            )}

                            {/* When */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field>
                                    <FieldLabel htmlFor="date">Date</FieldLabel>
                                    <input
                                        id="date"
                                        type="date"
                                        value={values.date}
                                        onChange={(e) => set("date", e.target.value)}
                                        className={inputClass(errors.date)}
                                    />
                                    <FieldError message={errors.date} />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="time">Time</FieldLabel>
                                    <input
                                        id="time"
                                        type="time"
                                        value={values.time}
                                        onChange={(e) => set("time", e.target.value)}
                                        className={inputClass(errors.time)}
                                    />
                                    <FieldError message={errors.time} />
                                </Field>
                            </div>

                            {/* Type + Status (status forced to unassigned here but editable later if you want) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field>
                                    <FieldLabel>Type</FieldLabel>
                                    <div className="flex items-center gap-4">
                                        <label className="inline-flex items-center gap-2 text-sm">
                                            <input
                                                type="radio"
                                                name="rideType"
                                                value="reservation"
                                                checked={values.type === "reservation"}
                                                onChange={() => set("type", "reservation")}
                                            />
                                            Reservation
                                        </label>
                                        <label className="inline-flex items-center gap-2 text-sm">
                                            <input
                                                type="radio"
                                                name="rideType"
                                                value="asap"
                                                checked={values.type === "asap"}
                                                onChange={() => set("type", "asap")}
                                            />
                                            ASAP
                                        </label>
                                        <label className="inline-flex items-center gap-2 text-sm">
                                            <input
                                                type="radio"
                                                name="rideType"
                                                value=""
                                                checked={!values.type}
                                                onChange={() => set("type", "")}
                                            />
                                            Auto (by time)
                                        </label>
                                    </div>
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="notes">Notes</FieldLabel>
                                    <textarea
                                        id="notes"
                                        rows={3}
                                        value={values.notes}
                                        onChange={(e) => set("notes", e.target.value)}
                                        className={inputClass()}
                                        placeholder="Internal notes"
                                    />
                                </Field>
                            </div>

                            {/* Visibility */}
                            <label className="inline-flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={values.coveredVisible}
                                    onChange={(e) => set("coveredVisible", e.target.checked)}
                                />
                                Covered visible
                            </label>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    leftIcon={<ArrowLeft className="w-4 h-4" />}
                                    onClick={() => router.push("/rides")}
                                    className="w-full sm:w-auto"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    leftIcon={<Save className="w-4 h-4" />}
                                    className="w-full sm:w-auto"
                                    disabled={submitting}
                                >
                                    {submitting ? "Creating..." : "Create Ride"}
                                </Button>
                            </div>
                        </form>
                    </CardBody>
                </Card>
            </Container>
        </ProtectedLayout>
    );
}