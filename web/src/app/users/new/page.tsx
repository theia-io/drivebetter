"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import { ArrowLeft, Save } from "lucide-react";
import {createUser, Role} from "@/stores/users";
import { apiPost } from "@/services/http";
import {VehicleType} from "@/types/driver-details";
import { Field, FieldLabel, FieldError, inputClass } from "@/components/ui/commmon";

/* ------------------------------- Types ------------------------------- */

type NewUserForm = {
    name: string;
    email: string;
    phone: string;
    roles: string[];
};

type DriverDetailsForm = {
    vehicleType: VehicleType;
    vehicleMake: string;
    vehicleModel: string;
    vehicleYear: string;
    vehicleColor: string;
    plate: string;

    seatsTotal: string;
    maxPassengers: string;

    petFriendly: boolean;
    babySeat: boolean;
    boosterSeat: boolean;
    wheelchairAccessible: boolean;

    homeCity: string;
    serviceRadiusKm: string;

    primaryLanguage: string;
    languages: string;

    licenseNumber: string;
    licenseExpiry: string; // YYYY-MM-DD
};

/* ----------------------------- Initial State ----------------------------- */

const initialUser: NewUserForm = {
    name: "",
    email: "",
    phone: "",
    roles: ["driver"], // default new user as driver; adjust as needed
};

const initialDriver: DriverDetailsForm = {
    vehicleType: "sedan",
    vehicleMake: "",
    vehicleModel: "",
    vehicleYear: "",
    vehicleColor: "",
    plate: "",

    seatsTotal: "",
    maxPassengers: "",

    petFriendly: false,
    babySeat: false,
    boosterSeat: false,
    wheelchairAccessible: false,

    homeCity: "",
    serviceRadiusKm: "50",

    primaryLanguage: "en",
    languages: "",

    licenseNumber: "",
    licenseExpiry: "",
};

/* ------------------------------ Page ------------------------------ */

export default function NewUserWithDriverDetailsPage() {
    const router = useRouter();
    const [user, setUser] = useState<NewUserForm>(initialUser);
    const [driver, setDriver] = useState<DriverDetailsForm>(initialDriver);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const setU = <K extends keyof NewUserForm>(k: K, v: NewUserForm[K]) =>
        setUser((s) => ({ ...s, [k]: v }));
    const setD = <K extends keyof DriverDetailsForm>(k: K, v: DriverDetailsForm[K]) =>
        setDriver((s) => ({ ...s, [k]: v }));

    function validate(): Record<string, string> {
        const e: Record<string, string> = {};
        if (!user.name.trim()) e.name = "Name is required";
        if (!user.email.trim()) e.email = "Email is required";
        if (!user.roles.length) e.roles = "At least one role";
        // if includes driver, validate minimal driver fields
        if (user.roles.includes("driver")) {
            if (!driver.vehicleType) e.vehicleType = "Vehicle type required";
            if (!driver.seatsTotal) e.seatsTotal = "Seats total required";
            if (!driver.maxPassengers) e.maxPassengers = "Max passengers required";
        }
        return e;
    }

    async function onSubmit(ev: React.FormEvent) {
        ev.preventDefault();
        const e = validate();
        setErrors(e);
        if (Object.keys(e).length) return;

        setSubmitting(true);
        try {
            // 1) create user
            const created = await createUser({
                name: user.name.trim(),
                email: user.email.trim(),
                phone: user.phone.trim() || undefined,
                roles: user.roles as Role[],
            });

            // 2) if role includes driver -> create driver details
            if (user.roles.includes("driver")) {
                const payload = {
                    userId: created._id,
                    vehicle: {
                        type: driver.vehicleType,
                        make: driver.vehicleMake || undefined,
                        model: driver.vehicleModel || undefined,
                        year: driver.vehicleYear ? Number(driver.vehicleYear) : undefined,
                        color: driver.vehicleColor || undefined,
                        plate: driver.plate || undefined,
                    },
                    capacity: {
                        seatsTotal: driver.seatsTotal ? Number(driver.seatsTotal) : undefined,
                        maxPassengers: driver.maxPassengers ? Number(driver.maxPassengers) : undefined,
                    },
                    features: {
                        petFriendly: !!driver.petFriendly,
                        babySeat: !!driver.babySeat,
                        boosterSeat: !!driver.boosterSeat,
                        wheelchairAccessible: !!driver.wheelchairAccessible,
                    },
                    service: {
                        homeCity: driver.homeCity || undefined,
                        serviceRadiusKm: driver.serviceRadiusKm ? Number(driver.serviceRadiusKm) : undefined,
                    },
                    languages: {
                        primary: driver.primaryLanguage || undefined,
                        list: driver.languages
                            ? driver.languages.split(",").map((s) => s.trim()).filter(Boolean)
                            : undefined,
                    },
                    compliance: {
                        licenseNumber: driver.licenseNumber || undefined,
                        licenseExpiry: driver.licenseExpiry ? new Date(driver.licenseExpiry) : undefined,
                    },
                };

                await apiPost("/driver-details", payload);
            }

            router.push("/users");
        } catch (err) {
            console.error(err);
            alert("Failed to create user or driver details");
        } finally {
            setSubmitting(false);
        }
    }

    const toggleRole = (role: string) => {
        setUser((s) => {
            const has = s.roles.includes(role);
            const next = has ? s.roles.filter((r) => r !== role) : [...s.roles, role];
            return { ...s, roles: next };
        });
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
                    <div className="min-w-0">
                        <Typography
                            variant="h1"
                            className="text-lg sm:text-2xl font-bold text-gray-900 whitespace-normal break-words hyphens-auto"
                        >
                            Create User & Driver Profile
                        </Typography>
                    </div>
                </div>

                <Card variant="elevated" className="max-w-4xl">
                    <CardBody className="p-4 sm:p-6">
                        <form onSubmit={onSubmit} className="space-y-8" noValidate>
                            {/* User */}
                            <section className="space-y-4">
                                <Typography className="text-sm font-semibold text-gray-900">User</Typography>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field>
                                        <FieldLabel htmlFor="name">Name</FieldLabel>
                                        <input
                                            id="name"
                                            value={user.name}
                                            onChange={(e) => setU("name", e.target.value)}
                                            className={inputClass(errors.name)}
                                            placeholder="Full name"
                                        />
                                        <FieldError message={errors.name} />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="email">Email</FieldLabel>
                                        <input
                                            id="email"
                                            type="email"
                                            value={user.email}
                                            onChange={(e) => setU("email", e.target.value)}
                                            className={inputClass(errors.email)}
                                            placeholder="name@example.com"
                                        />
                                        <FieldError message={errors.email} />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="phone">Phone</FieldLabel>
                                        <input
                                            id="phone"
                                            value={user.phone}
                                            onChange={(e) => setU("phone", e.target.value)}
                                            className={inputClass()}
                                            placeholder="+1 555 000 0000"
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel>Roles</FieldLabel>
                                        <div className="flex flex-wrap gap-3">
                                            {["driver", "dispatcher", "client", "admin"].map((r) => (
                                                <label key={r} className="inline-flex items-center gap-2 text-sm">
                                                    <input
                                                        type="checkbox"
                                                        checked={user.roles.includes(r)}
                                                        onChange={() => toggleRole(r)}
                                                    />
                                                    {r}
                                                </label>
                                            ))}
                                        </div>
                                        <FieldError message={errors.roles} />
                                    </Field>
                                </div>
                            </section>

                            {/* Driver Details */}
                            <section className={`space-y-4 ${user.roles.includes("driver") ? "" : "opacity-60 pointer-events-none"}`}>
                                <Typography className="text-sm font-semibold text-gray-900">Driver Details</Typography>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field>
                                        <FieldLabel htmlFor="vehicleType">Vehicle Type</FieldLabel>
                                        <select
                                            id="vehicleType"
                                            value={driver.vehicleType}
                                            onChange={(e) => setD("vehicleType", e.target.value as VehicleType)}
                                            className={inputClass(errors.vehicleType)}
                                        >
                                            {["sedan","suv","van","wagon","hatchback","pickup","other"].map(v => (
                                                <option key={v} value={v}>{v}</option>
                                            ))}
                                        </select>
                                        <FieldError message={errors.vehicleType} />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="plate">Plate</FieldLabel>
                                        <input
                                            id="plate"
                                            value={driver.plate}
                                            onChange={(e) => setD("plate", e.target.value)}
                                            className={inputClass()}
                                            placeholder="ABC-123"
                                        />
                                    </Field>

                                    <Field>
                                        <FieldLabel htmlFor="make">Make</FieldLabel>
                                        <input
                                            id="make"
                                            value={driver.vehicleMake}
                                            onChange={(e) => setD("vehicleMake", e.target.value)}
                                            className={inputClass()}
                                            placeholder="Toyota"
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="model">Model</FieldLabel>
                                        <input
                                            id="model"
                                            value={driver.vehicleModel}
                                            onChange={(e) => setD("vehicleModel", e.target.value)}
                                            className={inputClass()}
                                            placeholder="Camry"
                                        />
                                    </Field>

                                    <Field>
                                        <FieldLabel htmlFor="year">Year</FieldLabel>
                                        <input
                                            id="year"
                                            type="number"
                                            inputMode="numeric"
                                            min={1970}
                                            max={2100}
                                            value={driver.vehicleYear}
                                            onChange={(e) => setD("vehicleYear", e.target.value)}
                                            className={inputClass()}
                                            placeholder="2020"
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="color">Color</FieldLabel>
                                        <input
                                            id="color"
                                            value={driver.vehicleColor}
                                            onChange={(e) => setD("vehicleColor", e.target.value)}
                                            className={inputClass()}
                                            placeholder="Black"
                                        />
                                    </Field>

                                    <Field>
                                        <FieldLabel htmlFor="seatsTotal">Seats Total</FieldLabel>
                                        <input
                                            id="seatsTotal"
                                            type="number"
                                            min={1}
                                            max={9}
                                            value={driver.seatsTotal}
                                            onChange={(e) => setD("seatsTotal", e.target.value)}
                                            className={inputClass(errors.seatsTotal)}
                                            placeholder="4"
                                        />
                                        <FieldError message={errors.seatsTotal} />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="maxPassengers">Max Passengers</FieldLabel>
                                        <input
                                            id="maxPassengers"
                                            type="number"
                                            min={1}
                                            max={8}
                                            value={driver.maxPassengers}
                                            onChange={(e) => setD("maxPassengers", e.target.value)}
                                            className={inputClass(errors.maxPassengers)}
                                            placeholder="3"
                                        />
                                        <FieldError message={errors.maxPassengers} />
                                    </Field>

                                    <Field>
                                        <FieldLabel htmlFor="homeCity">Home City</FieldLabel>
                                        <input
                                            id="homeCity"
                                            value={driver.homeCity}
                                            onChange={(e) => setD("homeCity", e.target.value)}
                                            className={inputClass()}
                                            placeholder="Los Angeles"
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="radius">Service Radius (km)</FieldLabel>
                                        <input
                                            id="radius"
                                            type="number"
                                            min={0}
                                            step={1}
                                            value={driver.serviceRadiusKm}
                                            onChange={(e) => setD("serviceRadiusKm", e.target.value)}
                                            className={inputClass()}
                                            placeholder="50"
                                        />
                                    </Field>

                                    <Field>
                                        <FieldLabel htmlFor="primaryLang">Primary Language</FieldLabel>
                                        <input
                                            id="primaryLang"
                                            value={driver.primaryLanguage}
                                            onChange={(e) => setD("primaryLanguage", e.target.value)}
                                            className={inputClass()}
                                            placeholder="en"
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="langs">Other Languages (comma-separated)</FieldLabel>
                                        <input
                                            id="langs"
                                            value={driver.languages}
                                            onChange={(e) => setD("languages", e.target.value)}
                                            className={inputClass()}
                                            placeholder="es, fr"
                                        />
                                    </Field>

                                    <Field>
                                        <FieldLabel htmlFor="license">License Number</FieldLabel>
                                        <input
                                            id="license"
                                            value={driver.licenseNumber}
                                            onChange={(e) => setD("licenseNumber", e.target.value)}
                                            className={inputClass()}
                                            placeholder="D1234567"
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="licenseExpiry">License Expiry</FieldLabel>
                                        <input
                                            id="licenseExpiry"
                                            type="date"
                                            value={driver.licenseExpiry}
                                            onChange={(e) => setD("licenseExpiry", e.target.value)}
                                            className={inputClass()}
                                        />
                                    </Field>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
                                        <span className="text-sm font-medium text-gray-900">Features</span>
                                        <label className="inline-flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={driver.petFriendly}
                                                onChange={(e) => setD("petFriendly", e.target.checked)}
                                            />
                                            Pet friendly
                                        </label>
                                        <label className="inline-flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={driver.babySeat}
                                                onChange={(e) => setD("babySeat", e.target.checked)}
                                            />
                                            Baby seat
                                        </label>
                                        <label className="inline-flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={driver.boosterSeat}
                                                onChange={(e) => setD("boosterSeat", e.target.checked)}
                                            />
                                            Booster seat
                                        </label>
                                        <label className="inline-flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={driver.wheelchairAccessible}
                                                onChange={(e) => setD("wheelchairAccessible", e.target.checked)}
                                            />
                                            Wheelchair accessible
                                        </label>
                                    </div>
                                </div>
                            </section>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    leftIcon={<ArrowLeft className="w-4 h-4" />}
                                    onClick={() => router.push("/users")}
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
                                    {submitting ? "Creating..." : "Create"}
                                </Button>
                            </div>
                        </form>
                    </CardBody>
                </Card>
            </Container>
        </ProtectedLayout>
    );
}