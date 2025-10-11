"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import { ArrowLeft, Save } from "lucide-react";
import DriverCombobox from "@/components/ui/DriverCombobox";
import PlaceCombobox from "@/components/ui/maps/PlaceCombobox";
import LeafletMap from "@/components/ui/maps/LeafletMap";
import { useRidesStore } from "@/stores/rides";
import { PlaceHit } from "@/stores/geocode";
import { getRoute } from "@/stores/routes";
import {currentHourTimeInput, todayDateInput} from "@/services/datetime";

/* ------------------------------- Types ------------------------------- */

type RideType = "reservation" | "asap";
type RideStatus = "unassigned" | "assigned" | "on_my_way" | "on_location" | "pob" | "clear" | "completed";

interface RideFormValues {
    assignedDriverId?: string;
    clientId?: string;
    fromLabel: string;
    toLabel: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:mm
    type: RideType | "";
    status: RideStatus;
    notes: string;
    coveredVisible: boolean;
}

/* ----------------------------- Initial State ----------------------------- */

const initialValues: RideFormValues = {
    assignedDriverId: undefined,
    clientId: undefined,
    fromLabel: "",
    toLabel: "",
    date: todayDateInput(),
    time: currentHourTimeInput(),
    type: "",
    status: "unassigned",
    notes: "",
    coveredVisible: true,
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

        if (v.assignedDriverId && v.status === "unassigned") {
            set("status", "assigned");
        }
        return e;
    };

    const onSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        const e = validate(values);
        setErrors(e);
        if (Object.keys(e).length) return;

        setSubmitting(true);
        try {
            const create = useRidesStore.getState().createRide;

            const iso = new Date(`${values.date}T${values.time}:00`).toISOString();

            const payload: any = {
                assignedDriverId: values.assignedDriverId || undefined,
                clientId: values.clientId || undefined,

                from: values.fromLabel,
                to: values.toLabel,

                datetime: iso,
                type: values.type || undefined,

                status: values.status,
                notes: values.notes,
                coveredVisible: values.coveredVisible,

                fromLocation: pickupHit
                    ? { type: "Point", coordinates: [pickupHit.lon, pickupHit.lat] }
                    : undefined,
                toLocation: destHit
                    ? { type: "Point", coordinates: [destHit.lon, destHit.lat] }
                    : undefined,
            };

            const created = await create(payload);
            if (created) router.push("/rides");
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
                            Create and schedule a new ride
                        </Typography>
                    </div>
                </div>

                <Card variant="elevated" className="max-w-3xl">
                    <CardBody className="p-4 sm:p-6">
                        <form onSubmit={onSubmit} className="space-y-6" noValidate>
                            {/* Assignment */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field>
                                    <FieldLabel htmlFor="driver">Driver</FieldLabel>
                                    <DriverCombobox
                                        id="driver"
                                        onChange={(driver: any | null) => {
                                            set("assignedDriverId", driver?._id || undefined);
                                            if (driver && values.status === "unassigned") set("status", "assigned");
                                            if (!driver && values.status === "assigned") set("status", "unassigned");
                                        }}
                                        error={errors["assignedDriverId"]} valueEmail={""}                                    />
                                    <FieldError message={errors["assignedDriverId"]} />
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="client">Client (optional)</FieldLabel>
                                    <input
                                        id="client"
                                        type="text"
                                        value={values.clientId || ""}
                                        onChange={(e) => set("clientId", e.target.value)}
                                        className={inputClass()}
                                        placeholder="Client name / phone / notes"
                                    />
                                </Field>
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

                            {/* Route preview (when both picked) */}
                            {(pickupHit && destHit) && (
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

                            {/* Type + Status */}
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
                                    <FieldLabel htmlFor="status">Status</FieldLabel>
                                    <select
                                        id="status"
                                        value={values.status}
                                        onChange={(e) => set("status", e.target.value as RideStatus)}
                                        className={inputClass()}
                                    >
                                        <option value="unassigned">Unassigned</option>
                                        <option value="assigned">Assigned</option>
                                        <option value="on_my_way">On my way</option>
                                        <option value="on_location">On location</option>
                                        <option value="pob">POB</option>
                                        <option value="clear">Clear</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </Field>
                            </div>

                            {/* Notes + visibility */}
                            <div className="grid grid-cols-1 gap-4">
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

                                <label className="inline-flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={values.coveredVisible}
                                        onChange={(e) => set("coveredVisible", e.target.checked)}
                                    />
                                    Covered visible
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
            </Container>
        </ProtectedLayout>
    );
}

/* ----------------------------- UI primitives ---------------------------- */

function Field({ children }: { children: React.ReactNode }) {
    return <div className="space-y-1.5">{children}</div>;
}

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
    return <label htmlFor={htmlFor} className="flex items-center text-sm font-medium text-gray-700">{children}</label>;
}

function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return <p className="text-sm text-red-600">{message}</p>;
}

function inputClass(error?: string) {
    return [
        "w-full rounded-lg border px-3 py-2.5 text-sm sm:text-base",
        "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
        error ? "border-red-300" : "border-gray-300",
    ].join(" ");
}
