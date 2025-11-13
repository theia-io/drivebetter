// app/rides/new/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import {ArrowLeft, HelpCircle, Save} from "lucide-react";
import PlaceCombobox from "@/components/ui/maps/PlaceCombobox";
import LeafletMap from "@/components/ui/maps/LeafletMap";
import { createRide } from "@/stores/rides";
import { PlaceHit } from "@/stores/geocode";
import { getRoute } from "@/stores/routes";
import { currentHourTimeInput, todayDateInput } from "@/services/datetime";
import { VehicleType } from "@/types/driver-details";
import { RideStatus, RideType } from "@/types/ride";
import { Field, FieldLabel, FieldError, inputClass } from "@/components/ui/commmon";
import {useAuthStore} from "@/stores";

/* ------------------------------- Types ------------------------------- */

interface RideFormValues {
    customer?: {
        name: string;
        phone: string;
    };
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
    customer: { name: "", phone: "" },
    fromLabel: "",
    toLabel: "",
    date: todayDateInput(),
    time: currentHourTimeInput(),
    type: "",
    status: "unassigned",
    notes: "",
    coveredVisible: true,
    passengers: 1,
    luggages: 0,
    vehicleType: "",
    language: "",
    airportTrip: false,
    longDistance: false,
};
type NextStep = "assign" | "share" | "skip";

export default function NewRidePage() {
    const router = useRouter();
    const [values, setValues] = useState<RideFormValues>(initialValues);
    const { user } = useAuthStore();
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [nextStep, setNextStep] = useState<NextStep>("skip");

    const [pickupHit, setPickupHit] = useState<PlaceHit | null>(null);
    const [destHit, setDestHit] = useState<PlaceHit | null>(null);
    const [routeLine, setRouteLine] = useState<[number, number][]>([]);
    const [distanceMeters, setDistanceMeters] = useState<number>(0);
    const [durationMinutes, setDurationMinutes] = useState<number>(0);

    // Info panel toggle (mobile/tablet)
    const [showInfo, setShowInfo] = useState(false);

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

            // Stage 1: create UNASSIGNED ride
            const payload: any = {
                creatorId: user._id,
                customer: values.customer || undefined,
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

            const created = await createRide(payload);
            if (created?._id) {
                const sp = new URLSearchParams();
                if (values.passengers) sp.set("passengers", String(values.passengers));
                if (values.luggages) sp.set("luggages", String(values.luggages));
                if (values.vehicleType) sp.set("vehicleType", String(values.vehicleType));
                if (values.language) sp.set("language", values.language);
                if (values.airportTrip) sp.set("airportTrip", "1");
                if (values.longDistance) sp.set("longDistance", "1");

                if (nextStep === "assign") {
                    router.push(`/rides/${created._id}/assign?${sp.toString()}`);
                } else if(nextStep === "share") {
                    router.push(`/rides/${created._id}/share`);
                } else {
                    router.push(`/rides/${created._id}`);
                }
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
                {/* Header */}
                <div className="flex items-center mb-4 sm:mb-6 justify-between">
                    <div className="flex items-center">
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
                                <b>Stage 1:</b> Create the ride (assign/share later)
                            </Typography>
                        </div>
                    </div>

                    {/* Mobile/Tablet: quick help toggle */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="xl:hidden"
                        aria-expanded={showInfo}
                        aria-controls="mobile-help-panel"
                        onClick={() => setShowInfo((v) => !v)}
                    >
                        <HelpCircle className="w-4 h-4 mr-1" aria-hidden="true" />
                        {showInfo ? "Hide help" : "How this works"}
                    </Button>
                </div>

                {/* Mobile/Tablet help (right under header) */}
                {showInfo && (
                    <aside id="mobile-help-panel" className="xl:hidden mb-6">
                        <Card variant="elevated">
                            <CardBody className="p-4 sm:p-5 space-y-3">
                                <Typography className="text-sm font-semibold text-gray-900">
                                    How ride creation works
                                </Typography>
                                <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
                                    <li>
                                        Create an <span className="font-medium">unassigned</span> ride.
                                    </li>
                                    <li>
                                        Next, either <span className="font-medium">assign a driver</span> directly or{" "}
                                        <span className="font-medium">share</span> to drivers/groups.
                                    </li>
                                    <li>
                                        Drivers can <span className="font-medium">request</span> the ride; you{" "}
                                        <span className="font-medium">approve</span> one.
                                    </li>
                                    <li>
                                        Approving assigns the ride and <span className="font-medium">disables</span> other shares.
                                    </li>
                                </ol>
                            </CardBody>
                        </Card>
                    </aside>
                )}

                {/* Responsive layout: form + right info panel */}
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
                    {/* Left: the form card */}
                    <Card variant="elevated" className="w-full">
                        <CardBody className="p-4 sm:p-6">
                            <form onSubmit={onSubmit} className="space-y-6" noValidate>
                                {/* Client (optional) */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field>
                                        <FieldLabel htmlFor="customerName">Client Name</FieldLabel>
                                        <input
                                            id="customerName"
                                            type="text"
                                            value={values.customer?.name || ""}
                                            onChange={(e) =>
                                                set("customer", { ...(values.customer ?? { name: "", phone: "" }), name: e.target.value })
                                            }
                                            className={inputClass()}
                                            placeholder="Client name"
                                        />
                                    </Field>

                                    <Field>
                                        <FieldLabel htmlFor="customerPhone">Client Phone</FieldLabel>
                                        <input
                                            id="customerPhone"
                                            type="text"
                                            value={values.customer?.phone || ""}
                                            onChange={(e) =>
                                                set("customer", { ...(values.customer ?? { name: "", phone: "" }), phone: e.target.value })
                                            }
                                            className={inputClass()}
                                            placeholder="Client phone"
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

                                {/* Type + Notes */}
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
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-medium text-gray-900">Next step:</span>
                                    <label className="inline-flex items-center gap-2 text-sm">
                                        <input
                                            type="radio"
                                            name="nextStep"
                                            value="assign"
                                            checked={nextStep === "skip"}
                                            onChange={() => setNextStep("skip")}
                                        />
                                        Skip
                                    </label>
                                    <label className="inline-flex items-center gap-2 text-sm">
                                        <input
                                            type="radio"
                                            name="nextStep"
                                            value="assign"
                                            checked={nextStep === "assign"}
                                            onChange={() => setNextStep("assign")}
                                        />
                                        Assign a driver
                                    </label>
                                    <label className="inline-flex items-center gap-2 text-sm">
                                        <input
                                            type="radio"
                                            name="nextStep"
                                            value="share"
                                            checked={nextStep === "share"}
                                            onChange={() => setNextStep("share")}
                                        />
                                        Create a share
                                    </label>
                                </div>

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

                    {/* Right: sticky info panel (desktop only) */}
                    <aside className="hidden xl:block">
                        <div className="sticky top-6">
                            <Card variant="elevated">
                                <CardBody className="p-4 sm:p-5 space-y-3">
                                    <Typography className="text-sm font-semibold text-gray-900">
                                        How ride creation works
                                    </Typography>

                                    <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
                                        <li>
                                            Create an <span className="font-medium">unassigned</span> ride.
                                        </li>
                                        <li>
                                            Next, either <span className="font-medium">assign a driver</span> directly or{" "}
                                            <span className="font-medium">share</span> to drivers/groups.
                                        </li>
                                        <li>
                                            Drivers can <span className="font-medium">request</span> the ride; you{" "}
                                            <span className="font-medium">approve</span> one.
                                        </li>
                                        <li>
                                            Approving assigns the ride and <span className="font-medium">disables</span> other shares.
                                        </li>
                                    </ol>

                                    <div className="rounded-md border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900">
                                        Tip: If timing is tight, assign directly. For broader availability, create a share.
                                    </div>
                                </CardBody>
                            </Card>
                        </div>
                    </aside>
                </div>
            </Container>
        </ProtectedLayout>
    );
}
