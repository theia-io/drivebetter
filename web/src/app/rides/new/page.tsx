// app/rides/new/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import { Save, ChevronDown } from "lucide-react";
import PlaceCombobox from "@/components/ui/maps/PlaceCombobox";
import LeafletMap from "@/components/ui/maps/LeafletMap";
import { createRide } from "@/stores/rides";
import { PlaceHit } from "@/stores/geocode";
import { getRoute } from "@/stores/routes";
import { currentHourTimeInput, todayDateInput } from "@/services/datetime";
import { VehicleType } from "@/types/driver-details";
import { RideType } from "@/types/ride";
import {
    Field,
    FieldLabel,
    FieldError,
    inputClass,
} from "@/components/ui/commmon";
import { useAuthStore } from "@/stores";
import { RideStatus } from "@/types/rideStatus";
import { useMyCustomers } from "@/stores/customers";
import NewRideHeader from "@/app/rides/new/components/NewRideHeader";
import CustomerSelect from "@/components/ride/selectors/CustomerSelect";

/* ------------------------------- Types ------------------------------- */

interface RideFormValues {
    customer?: {
        name: string;
        phone: string;
    };
    customerUserId?: string;

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
    customerUserId: undefined,
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
    const searchParams = useSearchParams();
    const { user } = useAuthStore();

    const [values, setValues] = useState<RideFormValues>(initialValues);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [nextStep, setNextStep] = useState<NextStep>("skip");

    const [pickupHit, setPickupHit] = useState<PlaceHit | null>(null);
    const [destHit, setDestHit] = useState<PlaceHit | null>(null);
    const [routeLine, setRouteLine] = useState<[number, number][]>([]);
    const [distanceMeters, setDistanceMeters] = useState<number>(0);
    const [durationMinutes, setDurationMinutes] = useState<number>(0);

    const [clientOpen, setClientOpen] = useState(false);

    const { data: customers = [] } = useMyCustomers();

    const urlCustomerId = searchParams.get("customerId") || "";

    const set = <K extends keyof RideFormValues>(k: K, v: RideFormValues[K]) =>
        setValues((prev) => ({ ...prev, [k]: v }));

    const validate = (v: RideFormValues) => {
        const e: Record<string, string> = {};
        if (!v.fromLabel.trim()) e.fromLabel = "Pickup is required";
        if (!v.toLabel.trim()) e.toLabel = "Destination is required";
        if (!v.date) e.date = "Pickup date is required";
        if (!v.time) e.time = "Pickup time is required";
        if (!pickupHit) e.fromLabel = "Select a pickup from suggestions";
        if (!destHit) e.toLabel = "Select a destination from suggestions";
        return e;
    };

    // Prefill from ?customerId=
    useEffect(() => {
        if (!customers.length || !urlCustomerId) return;

        const c = customers.find(
            (cust: any) =>
                cust.user?._id === urlCustomerId || cust.profile?._id === urlCustomerId,
        );
        if (!c) return;

        const u = c.user || {};
        setValues((prev) => ({
            ...prev,
            customerUserId: u._id,
            customer: {
                name: u.name || prev.customer?.name || "",
                phone: u.phone || prev.customer?.phone || "",
            },
        }));
    }, [customers, urlCustomerId]);

    const onSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        const e = validate(values);
        setErrors(e);
        if (Object.keys(e).length) return;

        setSubmitting(true);
        try {
            const iso = new Date(`${values.date}T${values.time}:00`).toISOString();

            const payload: any = {
                creatorId: user._id,
                customerUserId: values.customerUserId || undefined,
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
                    ? {
                        type: "Point",
                        coordinates: [pickupHit.lon, pickupHit.lat],
                    }
                    : undefined,
                toLocation: destHit
                    ? {
                        type: "Point",
                        coordinates: [destHit.lon, destHit.lat],
                    }
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
                } else if (nextStep === "share") {
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

    // route preview
    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!pickupHit || !destHit) {
                setRouteLine([]);
                setDistanceMeters(0);
                setDurationMinutes(0);
                return;
            }
            const r = await getRoute(
                [pickupHit.lon, pickupHit.lat],
                [destHit.lon, destHit.lat],
            );
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
            <Container className="px-3 sm:px-6 lg:px-8">
                <NewRideHeader />

                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
                    {/* Left: form */}
                    <Card variant="elevated" className="w-full">
                        <CardBody className="p-4 sm:p-6">
                            <form onSubmit={onSubmit} className="space-y-6" noValidate>
                                {/* Ride details */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Typography className="text-sm sm:text-base font-semibold text-gray-900">
                                            Ride details
                                        </Typography>
                                        <span className="text-[11px] text-gray-500">
                                            * required
                                        </span>
                                    </div>

                                    {/* Pickup / destination */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Field>
                                            <FieldLabel htmlFor="pickup">
                                                Pickup <span className="text-red-500">*</span>
                                            </FieldLabel>
                                            <PlaceCombobox
                                                id="pickup"
                                                value={values.fromLabel}
                                                onSelectedChange={(hit) => {
                                                    if (hit) {
                                                        set("fromLabel", hit.label);
                                                        setPickupHit(hit);
                                                    } else {
                                                        setPickupHit(null);
                                                        set("fromLabel", "");
                                                    }
                                                }}
                                                error={errors.fromLabel}
                                            />
                                            <FieldError message={errors.fromLabel} />
                                        </Field>

                                        <Field>
                                            <FieldLabel htmlFor="destination">
                                                Destination{" "}
                                                <span className="text-red-500">*</span>
                                            </FieldLabel>
                                            <PlaceCombobox
                                                id="destination"
                                                value={values.toLabel}
                                                onSelectedChange={(hit) => {
                                                    if (hit) {
                                                        set("toLabel", hit.label);
                                                        setDestHit(hit);
                                                    } else {
                                                        setDestHit(null);
                                                        set("toLabel", "");
                                                    }
                                                }}
                                                error={errors.toLabel}
                                            />
                                            <FieldError message={errors.toLabel} />
                                        </Field>
                                    </div>

                                    {/* Route preview */}
                                    {pickupHit && destHit && (
                                        <div className="space-y-2">
                                            <LeafletMap
                                                heightClass="h-56 sm:h-64"
                                                markerA={[pickupHit.lon, pickupHit.lat]}
                                                markerALabel="Pickup"
                                                markerB={[destHit.lon, destHit.lat]}
                                                markerBLabel="Destination"
                                                routeLine={routeLine}
                                            />
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-700">
                                                <div>
                                                    Distance:{" "}
                                                    {(distanceMeters / 1000).toFixed(1)} km
                                                </div>
                                                <div>
                                                    Estimated duration: {durationMinutes} min
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* date & time */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Field>
                                            <FieldLabel htmlFor="date">
                                                Pickup date{" "}
                                                <span className="text-red-500">*</span>
                                            </FieldLabel>
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
                                            <FieldLabel htmlFor="time">
                                                Pickup time{" "}
                                                <span className="text-red-500">*</span>
                                            </FieldLabel>
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
                                </div>

                                {/* CLIENT & PREFERENCES – ACCORDION */}
                                <div className="pt-2 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => setClientOpen((v) => !v)}
                                        className="w-full flex items-center justify-between gap-2 py-2"
                                    >
                                        <div className="flex flex-col items-start">
                                            <span className="text-sm sm:text-base font-semibold text-gray-900">
                                                Client & preferences
                                            </span>
                                            <span className="text-[11px] text-gray-500">
                                                Optional information for driver matching
                                            </span>
                                        </div>
                                        <span
                                            className={`inline-flex items-center justify-center rounded-full border border-gray-200 bg-white p-1 transition-transform ${
                                                clientOpen ? "rotate-180" : ""
                                            }`}
                                        >
                                            <ChevronDown className="w-4 h-4 text-gray-600" />
                                        </span>
                                    </button>

                                    {clientOpen && (
                                        <div className="mt-2 space-y-4">
                                            {/* Linked customer selector */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <CustomerSelect
                                                    customers={customers as any[]}
                                                    currentCustomerId={
                                                        values.customerUserId ||
                                                        (urlCustomerId || undefined)
                                                    }
                                                    label="Linked customer"
                                                    onSelected={({
                                                                     customerUserId,
                                                                     name,
                                                                     phone,
                                                                 }) => {
                                                        set(
                                                            "customerUserId",
                                                            customerUserId || undefined,
                                                        );
                                                        if (name || phone) {
                                                            set("customer", {
                                                                name:
                                                                    name ??
                                                                    values.customer?.name ??
                                                                    "",
                                                                phone:
                                                                    phone ??
                                                                    values.customer?.phone ??
                                                                    "",
                                                            });
                                                        }
                                                    }}
                                                />

                                                <div className="text-[11px] text-gray-500 pt-5">
                                                    Search and select a customer you invited to link
                                                    this ride to their history. Leave as “Not
                                                    linked” for one-off clients.
                                                </div>
                                            </div>

                                            {/* Client name / phone */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <Field>
                                                    <FieldLabel htmlFor="customerName">
                                                        Client name
                                                    </FieldLabel>
                                                    <input
                                                        id="customerName"
                                                        type="text"
                                                        value={values.customer?.name || ""}
                                                        onChange={(e) =>
                                                            set("customer", {
                                                                ...(values.customer ?? {
                                                                    name: "",
                                                                    phone: "",
                                                                }),
                                                                name: e.target.value,
                                                            })
                                                        }
                                                        className={inputClass()}
                                                        placeholder="Optional"
                                                    />
                                                </Field>

                                                <Field>
                                                    <FieldLabel htmlFor="customerPhone">
                                                        Client phone
                                                    </FieldLabel>
                                                    <input
                                                        id="customerPhone"
                                                        type="text"
                                                        value={values.customer?.phone || ""}
                                                        onChange={(e) =>
                                                            set("customer", {
                                                                ...(values.customer ?? {
                                                                    name: "",
                                                                    phone: "",
                                                                }),
                                                                phone: e.target.value,
                                                            })
                                                        }
                                                        className={inputClass()}
                                                        placeholder="Optional"
                                                    />
                                                </Field>
                                            </div>

                                            {/* Light assignment filters */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <Field>
                                                    <FieldLabel htmlFor="passengers">
                                                        Passengers
                                                    </FieldLabel>
                                                    <input
                                                        id="passengers"
                                                        type="number"
                                                        min={1}
                                                        value={values.passengers ?? 1}
                                                        onChange={(e) =>
                                                            set(
                                                                "passengers",
                                                                Number(
                                                                    e.target.value || 1,
                                                                ),
                                                            )
                                                        }
                                                        className={inputClass()}
                                                    />
                                                </Field>

                                                <Field>
                                                    <FieldLabel htmlFor="luggages">
                                                        Luggage
                                                    </FieldLabel>
                                                    <input
                                                        id="luggages"
                                                        type="number"
                                                        min={0}
                                                        value={values.luggages ?? 0}
                                                        onChange={(e) =>
                                                            set(
                                                                "luggages",
                                                                Number(
                                                                    e.target.value || 0,
                                                                ),
                                                            )
                                                        }
                                                        className={inputClass()}
                                                    />
                                                </Field>

                                                <Field>
                                                    <FieldLabel htmlFor="vehicleType">
                                                        Vehicle type
                                                    </FieldLabel>
                                                    <select
                                                        id="vehicleType"
                                                        value={values.vehicleType || ""}
                                                        onChange={(e) =>
                                                            set(
                                                                "vehicleType",
                                                                e.target
                                                                    .value as VehicleType | "",
                                                            )
                                                        }
                                                        className={inputClass()}
                                                    >
                                                        <option value="">Any</option>
                                                        <option value="sedan">Sedan</option>
                                                        <option value="suv">SUV</option>
                                                        <option value="van">Van</option>
                                                        <option value="wagon">Wagon</option>
                                                        <option value="hatchback">
                                                            Hatchback
                                                        </option>
                                                        <option value="pickup">Pickup</option>
                                                        <option value="other">Other</option>
                                                    </select>
                                                </Field>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <Field>
                                                    <FieldLabel htmlFor="lang">
                                                        Preferred language
                                                    </FieldLabel>
                                                    <input
                                                        id="lang"
                                                        type="text"
                                                        value={values.language || ""}
                                                        onChange={(e) =>
                                                            set(
                                                                "language",
                                                                e.target.value,
                                                            )
                                                        }
                                                        className={inputClass()}
                                                        placeholder='e.g. "en"'
                                                    />
                                                </Field>

                                                <div className="flex flex-col gap-2 sm:col-span-2">
                                                    <label className="inline-flex items-center gap-2 text-xs sm:text-sm">
                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                values.airportTrip ?? false
                                                            }
                                                            onChange={(e) =>
                                                                set(
                                                                    "airportTrip",
                                                                    e.target.checked,
                                                                )
                                                            }
                                                        />
                                                        Airport trip
                                                    </label>
                                                    <label className="inline-flex items-center gap-2 text-xs sm:text-sm">
                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                values.longDistance ?? false
                                                            }
                                                            onChange={(e) =>
                                                                set(
                                                                    "longDistance",
                                                                    e.target.checked,
                                                                )
                                                            }
                                                        />
                                                        Long-distance trip
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* TYPE, NOTES, COVERAGE */}
                                <div className="space-y-4 pt-2 border-t border-gray-100">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Field>
                                            <FieldLabel>Ride type</FieldLabel>
                                            <div className="mt-1 space-y-2">
                                                <label className="flex items-start gap-2 rounded-md border border-gray-200 px-3 py-2 text-xs sm:text-sm hover:bg-gray-50">
                                                    <input
                                                        type="radio"
                                                        name="rideType"
                                                        value="reservation"
                                                        checked={
                                                            values.type === "reservation"
                                                        }
                                                        onChange={() =>
                                                            set(
                                                                "type",
                                                                "reservation" as RideType,
                                                            )
                                                        }
                                                        className="mt-0.5"
                                                    />
                                                    <span>
                                                        <span className="block font-medium text-gray-900">
                                                            Reservation
                                                        </span>
                                                        <span className="block text-[11px] text-gray-500">
                                                            Future pickup at scheduled time.
                                                        </span>
                                                    </span>
                                                </label>

                                                <label className="flex items-start gap-2 rounded-md border border-gray-200 px-3 py-2 text-xs sm:text-sm hover:bg-gray-50">
                                                    <input
                                                        type="radio"
                                                        name="rideType"
                                                        value="asap"
                                                        checked={values.type === "asap"}
                                                        onChange={() =>
                                                            set(
                                                                "type",
                                                                "asap" as RideType,
                                                            )
                                                        }
                                                        className="mt-0.5"
                                                    />
                                                    <span>
                                                        <span className="block font-medium text-gray-900">
                                                            ASAP
                                                        </span>
                                                        <span className="block text-[11px] text-gray-500">
                                                            As soon as possible pickup.
                                                        </span>
                                                    </span>
                                                </label>

                                                <label className="flex items-start gap-2 rounded-md border border-gray-200 px-3 py-2 text-xs sm:text-sm hover:bg-gray-50">
                                                    <input
                                                        type="radio"
                                                        name="rideType"
                                                        value=""
                                                        checked={!values.type}
                                                        onChange={() =>
                                                            set("type", "" as RideType | "")
                                                        }
                                                        className="mt-0.5"
                                                    />
                                                    <span>
                                                        <span className="block font-medium text-gray-900">
                                                            Auto
                                                        </span>
                                                        <span className="block text-[11px] text-gray-500">
                                                            Let the system decide based on pickup
                                                            time.
                                                        </span>
                                                    </span>
                                                </label>
                                            </div>
                                        </Field>

                                        <Field>
                                            <FieldLabel htmlFor="notes">
                                                Internal notes
                                            </FieldLabel>
                                            <textarea
                                                id="notes"
                                                rows={4}
                                                value={values.notes}
                                                onChange={(e) =>
                                                    set("notes", e.target.value)
                                                }
                                                className={inputClass()}
                                                placeholder="Driver instructions, internal comments…"
                                            />
                                        </Field>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="inline-flex items-start gap-2 text-xs sm:text-sm">
                                            <input
                                                type="checkbox"
                                                checked={values.coveredVisible}
                                                onChange={(e) =>
                                                    set(
                                                        "coveredVisible",
                                                        e.target.checked,
                                                    )
                                                }
                                                className="mt-0.5"
                                            />
                                            <span>
                                                <span className="block font-medium text-gray-900">
                                                    Include in coverage view
                                                </span>
                                                <span className="block text-[11px] text-gray-500">
                                                    Controls whether this ride is visible in
                                                    internal coverage / overview views.
                                                </span>
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                {/* AFTER SAVING */}
                                <div className="space-y-3 pt-2 border-t border-gray-100">
                                    <Typography className="text-sm font-semibold text-gray-900">
                                        After saving
                                    </Typography>
                                    <div className="space-y-2">
                                        <label className="flex items-start gap-2 rounded-md border border-gray-200 px-3 py-2 text-xs sm:text-sm hover:bg-gray-50">
                                            <input
                                                type="radio"
                                                name="nextStep"
                                                value="skip"
                                                checked={nextStep === "skip"}
                                                onChange={() => setNextStep("skip")}
                                                className="mt-0.5"
                                            />
                                            <span>
                                                <span className="block font-medium text-gray-900">
                                                    Open ride details
                                                </span>
                                                <span className="block text-[11px] text-gray-500">
                                                    Create the ride and go to its details page.
                                                </span>
                                            </span>
                                        </label>

                                        <label className="flex items-start gap-2 rounded-md border border-gray-200 px-3 py-2 text-xs sm:text-sm hover:bg-gray-50">
                                            <input
                                                type="radio"
                                                name="nextStep"
                                                value="assign"
                                                checked={nextStep === "assign"}
                                                onChange={() => setNextStep("assign")}
                                                className="mt-0.5"
                                            />
                                            <span>
                                                <span className="block font-medium text-gray-900">
                                                    Assign a driver
                                                </span>
                                                <span className="block text-[11px] text-gray-500">
                                                    Go straight to driver assignment after creating
                                                    the ride.
                                                </span>
                                            </span>
                                        </label>

                                        <label className="flex items-start gap-2 rounded-md border border-gray-200 px-3 py-2 text-xs sm:text-sm hover:bg-gray-50">
                                            <input
                                                type="radio"
                                                name="nextStep"
                                                value="share"
                                                checked={nextStep === "share"}
                                                onChange={() => setNextStep("share")}
                                                className="mt-0.5"
                                            />
                                            <span>
                                                <span className="block font-medium text-gray-900">
                                                    Create a share
                                                </span>
                                                <span className="block text-[11px] text-gray-500">
                                                    Jump to ride sharing (drivers / groups) after
                                                    creating the ride.
                                                </span>
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
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
                                        {submitting ? "Creating..." : "Create ride"}
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
                                            Create an{" "}
                                            <span className="font-medium">unassigned</span> ride.
                                        </li>
                                        <li>
                                            Then{" "}
                                            <span className="font-medium">assign a driver</span> or{" "}
                                            <span className="font-medium">create a share</span>.
                                        </li>
                                        <li>
                                            Drivers <span className="font-medium">request</span> the
                                            ride; you <span className="font-medium">approve</span>{" "}
                                            one.
                                        </li>
                                        <li>
                                            Approving assigns the ride and{" "}
                                            <span className="font-medium">disables</span> other
                                            shares.
                                        </li>
                                    </ol>

                                    <div className="rounded-md border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900">
                                        Tip: link a registered customer so all their rides stay
                                        connected in reports and history.
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
