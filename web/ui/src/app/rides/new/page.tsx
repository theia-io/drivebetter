"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedLayout from "@/components/ProtectedLayout";
import {
    Button,
    Card,
    CardBody,
    Container,
    Typography,
} from "@/components/ui";
import {
    ArrowLeft,
    Calendar,
    Car,
    Clock,
    DollarSign,
    MapPin,
    Save,
    Star,
    User,
} from "lucide-react";

// Align with the existing domain model used on the list page
export type RideStatus = "scheduled" | "in-progress" | "completed";

export interface RideFormValues {
    passenger: string;
    pickup: string;
    destination: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:mm
    fareCents: number; // store money as integer cents
    distanceMeters: number; // store distance in meters
    durationMinutes: number;
    status: RideStatus;
    rating: number | ""; // optional 1..5
}

const initialValues: RideFormValues = {
    passenger: "",
    pickup: "",
    destination: "",
    date: "",
    time: "",
    fareCents: 0,
    distanceMeters: 0,
    durationMinutes: 0,
    status: "scheduled",
    rating: "",
};

export default function NewRidePage() {
    const router = useRouter();
    const [values, setValues] = useState<RideFormValues>(initialValues);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const set = (k: keyof RideFormValues, v: RideFormValues[keyof RideFormValues]) =>
        setValues((prev) => ({ ...prev, [k]: v }));

    const validate = (v: RideFormValues) => {
        const e: Record<string, string> = {};
        if (!v.passenger.trim()) e.passenger = "Passenger name is required";
        if (!v.pickup.trim()) e.pickup = "Pickup location is required";
        if (!v.destination.trim()) e.destination = "Destination is required";
        if (!v.date) e.date = "Date is required";
        if (!v.time) e.time = "Time is required";
        if (v.fareCents < 0) e.fareCents = "Fare cannot be negative";
        if (v.distanceMeters < 0) e.distanceMeters = "Distance cannot be negative";
        if (v.durationMinutes <= 0) e.durationMinutes = "Duration must be greater than 0";
        if (v.rating !== "" && (Number(v.rating) < 1 || Number(v.rating) > 5)) e.rating = "Rating must be 1-5";
        return e;
    };

    const onSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        const e = validate(values);
        setErrors(e);
        if (Object.keys(e).length) return;

        setSubmitting(true);
        try {
            // Hook up your API here; this is a placeholder POST.
            // Ensure you create app/api/rides/route.ts that persists to your DB.
            await fetch("/api/rides", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });
            router.push("/rides");
        } catch (err) {
            console.error(err);
            alert("Failed to create ride. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

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
                        <Typography variant="h1" className="text-2xl sm:text-3xl font-bold">New Ride</Typography>
                        <Typography variant="body1" className="text-gray-600 text-sm sm:text-base">Create and schedule a new ride</Typography>
                    </div>
                </div>

                <Card variant="elevated" className="max-w-3xl">
                    <CardBody className="p-4 sm:p-6">
                        <form onSubmit={onSubmit} className="space-y-6" noValidate>
                            {/* Passenger */}
                            <Field>
                                <FieldLabel htmlFor="passenger" icon={<User className="w-4 h-4" aria-hidden="true" />}>Passenger</FieldLabel>
                                <input
                                    id="passenger"
                                    type="text"
                                    autoComplete="name"
                                    value={values.passenger}
                                    onChange={(e) => set("passenger", e.target.value)}
                                    className={inputClass(errors.passenger)}
                                    placeholder="e.g., Sarah Johnson"
                                />
                                <FieldError message={errors.passenger} />
                            </Field>

                            {/* Locations */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field>
                                    <FieldLabel htmlFor="pickup" icon={<MapPin className="w-4 h-4" aria-hidden="true" />}>Pickup</FieldLabel>
                                    <input
                                        id="pickup"
                                        type="text"
                                        value={values.pickup}
                                        onChange={(e) => set("pickup", e.target.value)}
                                        className={inputClass(errors.pickup)}
                                        placeholder="e.g., Downtown Plaza"
                                    />
                                    <FieldError message={errors.pickup} />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="destination" icon={<MapPin className="w-4 h-4" aria-hidden="true" />}>Destination</FieldLabel>
                                    <input
                                        id="destination"
                                        type="text"
                                        value={values.destination}
                                        onChange={(e) => set("destination", e.target.value)}
                                        className={inputClass(errors.destination)}
                                        placeholder="e.g., LAX Airport"
                                    />
                                    <FieldError message={errors.destination} />
                                </Field>
                            </div>

                            {/* Date & Time */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field>
                                    <FieldLabel htmlFor="date" icon={<Calendar className="w-4 h-4" aria-hidden="true" />}>Date</FieldLabel>
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
                                    <FieldLabel htmlFor="time" icon={<Clock className="w-4 h-4" aria-hidden="true" />}>Time</FieldLabel>
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

                            {/* Fare, Distance, Duration */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Field>
                                    <FieldLabel htmlFor="fare" icon={<DollarSign className="w-4 h-4" aria-hidden="true" />}>Fare (USD)</FieldLabel>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                        <input
                                            id="fare"
                                            type="number"
                                            min={0}
                                            step={0.01}
                                            inputMode="decimal"
                                            value={values.fareCents ? (values.fareCents / 100).toString() : ""}
                                            onChange={(e) => {
                                                const dollars = Number(e.target.value || 0);
                                                set("fareCents", Math.round(dollars * 100));
                                            }}
                                            className={`${inputClass(errors.fareCents)} pl-7`}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <FieldError message={errors.fareCents} />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="distance" icon={<Car className="w-4 h-4" aria-hidden="true" />}>Distance (km)</FieldLabel>
                                    <input
                                        id="distance"
                                        type="number"
                                        min={0}
                                        step={0.1}
                                        inputMode="decimal"
                                        value={values.distanceMeters ? (values.distanceMeters / 1000).toString() : ""}
                                        onChange={(e) => {
                                            const km = Number(e.target.value || 0);
                                            set("distanceMeters", Math.round(km * 1000));
                                        }}
                                        className={inputClass(errors.distanceMeters)}
                                        placeholder="0.0"
                                    />
                                    <FieldError message={errors.distanceMeters} />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="duration" icon={<Clock className="w-4 h-4" aria-hidden="true" />}>Duration (min)</FieldLabel>
                                    <input
                                        id="duration"
                                        type="number"
                                        min={1}
                                        step={1}
                                        inputMode="numeric"
                                        value={values.durationMinutes || ""}
                                        onChange={(e) => set("durationMinutes", Number(e.target.value || 0))}
                                        className={inputClass(errors.durationMinutes)}
                                        placeholder="0"
                                    />
                                    <FieldError message={errors.durationMinutes} />
                                </Field>
                            </div>

                            {/* Status & Rating */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field>
                                    <FieldLabel htmlFor="status">Status</FieldLabel>
                                    <select
                                        id="status"
                                        value={values.status}
                                        onChange={(e) => set("status", e.target.value as RideStatus)}
                                        className={inputClass()}
                                    >
                                        <option value="scheduled">Scheduled</option>
                                        <option value="in-progress">In progress</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="rating" icon={<Star className="w-4 h-4" aria-hidden="true" />}>Rating (optional)</FieldLabel>
                                    <input
                                        id="rating"
                                        type="number"
                                        min={1}
                                        max={5}
                                        step={1}
                                        inputMode="numeric"
                                        value={values.rating}
                                        onChange={(e) => set("rating", e.target.value === "" ? "" : Number(e.target.value))}
                                        className={inputClass(errors.rating)}
                                        placeholder="1–5"
                                    />
                                    <FieldError message={errors.rating} />
                                </Field>
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

function FieldLabel({ htmlFor, children, icon }: { htmlFor?: string; children: React.ReactNode; icon?: React.ReactNode; }) {
    return (
        <label htmlFor={htmlFor} className="flex items-center text-sm font-medium text-gray-700">
            {icon ? <span className="mr-2 text-gray-500" aria-hidden="true">{icon}</span> : null}
            {children}
        </label>
    );
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