// app/rides/new/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import {
    Save,
    MapPin,
    Calendar,
    Clock,
    User as UserIcon,
    SlidersHorizontal,
    FileText,
    Users as UsersIcon,
    Share2,
} from "lucide-react";
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
import RideShareQuickPanel from "@/components/ride/RideShareQuickPanel";

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
    type: RideType; // only "reservation" | "asap"
    status: RideStatus;
    notes: string;
    coveredVisible: boolean;

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
    type: "reservation",
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

export default function NewRidePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuthStore();

    const [values, setValues] = useState<RideFormValues>(initialValues);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [pickupHit, setPickupHit] = useState<PlaceHit | null>(null);
    const [destHit, setDestHit] = useState<PlaceHit | null>(null);
    const [routeLine, setRouteLine] = useState<[number, number][]>([]);
    const [distanceMeters, setDistanceMeters] = useState<number>(0);
    const [durationMinutes, setDurationMinutes] = useState<number>(0);

    const { data: customers = [] } = useMyCustomers();
    const urlCustomerId = searchParams.get("customerId") || "";

    const [createdRideId, setCreatedRideId] = useState<string | null>(null);

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
        if (!v.type) e.type = "Ride type is required";
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
                type: values.type,
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
                setCreatedRideId(created._id);
            } else {
                alert("Ride created but response is missing ID.");
            }
        } catch (err) {
            console.error(err);
            alert("Failed to create ride.");
        } finally {
            setSubmitting(false);
        }
    };

    // Route preview
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

                <div className="mt-3 grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-5 items-start">
                    {/* Left: main form card */}
                    <Card variant="elevated" className="w-full">
                        <CardBody className="p-4 sm:p-6 space-y-6">
                            {/* Ride details */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50">
                                        <MapPin className="h-4 w-4 text-sky-600" />
                                    </div>
                                    <div>
                                        <Typography className="text-sm sm:text-base font-semibold text-gray-900">
                                            Ride details
                                        </Typography>
                                        <p className="text-[11px] sm:text-xs text-gray-500">
                                            Pickup, destination and time
                                        </p>
                                    </div>
                                    <span className="ml-auto text-[11px] text-gray-500">
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
                                            Destination <span className="text-red-500">*</span>
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

                                {/* Map / distance */}
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

                                {/* Date & time */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field>
                                        <FieldLabel htmlFor="date">
                                            <Calendar className="h-3.5 w-3.5 text-gray-500" />
                                            <span>
                                                Pickup date <span className="text-red-500">*</span>
                                            </span>
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
                                            <Clock className="h-3.5 w-3.5 text-gray-500" />
                                            <span>
                                                Pickup time <span className="text-red-500">*</span>
                                            </span>
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
                            </section>

                            {/* Client & preferences (always visible) */}
                            <section className="space-y-4 border-t border-gray-100 pt-4">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50">
                                        <UserIcon className="h-4 w-4 text-emerald-600" />
                                    </div>
                                    <div>
                                        <Typography className="text-sm sm:text-base font-semibold text-gray-900">
                                            Client & preferences
                                        </Typography>
                                        <p className="text-[11px] sm:text-xs text-gray-500">
                                            Link an existing customer or set ad-hoc client details
                                        </p>
                                    </div>
                                </div>

                                {/* Linked customer selector */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <CustomerSelect
                                        customers={customers as any[]}
                                        currentCustomerId={
                                            values.customerUserId ||
                                            (urlCustomerId || undefined)
                                        }
                                        label="Linked customer"
                                        onSelected={({ customerUserId, name, phone }) => {
                                            if (!customerUserId) {
                                                // "Not linked" → clear customer fields
                                                set("customerUserId", undefined);
                                                set("customer", { name: "", phone: "" });
                                                return;
                                            }

                                            set("customerUserId", customerUserId);
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
                                        }}
                                    />

                                    <div className="text-[11px] text-gray-500 pt-1 sm:pt-5">
                                        Link to a registered customer to keep their ride history
                                        connected. Choose{" "}
                                        <span className="font-medium">
                                            “Not linked / ad-hoc client”
                                        </span>{" "}
                                        for one-off customers.
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

                                {/* Light assignment preferences */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <SlidersHorizontal className="h-3.5 w-3.5 text-gray-500" />
                                        <span className="text-xs sm:text-sm font-medium text-gray-800">
                                            Preferences for assignment (optional)
                                        </span>
                                    </div>

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
                                                        Number(e.target.value || 1),
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
                                                        Number(e.target.value || 0),
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
                                                <option value="hatchback">Hatchback</option>
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
                                                    set("language", e.target.value)
                                                }
                                                className={inputClass()}
                                                placeholder='e.g. "en"'
                                            />
                                        </Field>

                                        <div className="flex flex-col gap-2 sm:col-span-2 pt-1">
                                            <label className="inline-flex items-center gap-2 text-xs sm:text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={values.airportTrip ?? false}
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
                                                    checked={values.longDistance ?? false}
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
                            </section>

                            {/* Type, notes, coverage */}
                            <section className="space-y-4 border-t border-gray-100 pt-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Ride type */}
                                    <Field>
                                        <FieldLabel>
                                            <UsersIcon className="h-3.5 w-3.5 text-gray-500" />
                                            <span>Ride type</span>
                                        </FieldLabel>
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
                                        </div>
                                        <FieldError message={errors.type} />
                                    </Field>

                                    {/* Notes */}
                                    <Field>
                                        <FieldLabel htmlFor="notes">
                                            <FileText className="h-3.5 w-3.5 text-gray-500" />
                                            <span>Internal notes</span>
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

                                {/* Coverage toggle */}
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
                                                Controls whether this ride is visible in internal
                                                coverage / overview views.
                                            </span>
                                        </span>
                                    </label>
                                </div>
                            </section>

                            {/* Actions */}
                            <section className="pt-2 border-t border-gray-100">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        colorScheme="secondary"
                                        onClick={() => router.push("/rides")}
                                        className="w-full sm:w-auto"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        leftIcon={<Save className="w-4 h-4" />}
                                        colorScheme="primary"
                                        className="w-full sm:w-auto"
                                        onClick={onSubmit}
                                        disabled={submitting}
                                    >
                                        {submitting ? "Creating…" : "Create ride"}
                                    </Button>
                                </div>

                                {createdRideId && (
                                    <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 space-y-3">
                                        <div className="flex items-center gap-2 text-xs sm:text-sm text-emerald-900">
                                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs">
                                                ✓
                                            </span>
                                            <div>
                                                <p className="font-semibold">
                                                    Ride created successfully
                                                </p>
                                                <p className="text-[11px] sm:text-xs text-emerald-900/80">
                                                    You can now assign a driver, share the ride or open
                                                    ride details.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <Button
                                                size="sm"
                                                colorScheme="primary"
                                                className="w-full sm:w-auto"
                                            >
                                                <a href={`/rides/${createdRideId}`}>
                                                    <FileText className="h-3.5 w-3.5 mr-1" />
                                                    Open ride details
                                                </a>
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                colorScheme="primary"
                                                className="w-full sm:w-auto"
                                            >
                                                <a href={`/rides/${createdRideId}/assign`}>
                                                    <UsersIcon className="h-3.5 w-3.5 mr-1" />
                                                    Assign driver
                                                </a>
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                colorScheme="primary"
                                                className="w-full sm:w-auto"
                                            >
                                                <a href={`/rides/${createdRideId}/share`}>
                                                    <Share2 className="h-3.5 w-3.5 mr-1" />
                                                    Manage shares
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </section>
                        </CardBody>
                    </Card>

                    {/* Right: quick share / assign panel */}
                    <aside className="space-y-3">
                        {createdRideId ? (
                            <RideShareQuickPanel
                                rideId={createdRideId}
                                className="w-full"
                            />
                        ) : (
                            <Card variant="elevated" className="w-full">
                                <CardBody className="p-4 space-y-2 text-xs sm:text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50">
                                            <Share2 className="h-4 w-4 text-indigo-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">
                                                Share and assign
                                            </p>
                                            <p className="text-[11px] sm:text-xs text-gray-500">
                                                After you create the ride, you will be able to assign a
                                                driver, share in groups, or create a public link here.
                                            </p>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        )}
                    </aside>
                </div>
            </Container>
        </ProtectedLayout>
    );
}
