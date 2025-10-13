// app/driver-details/[id]/edit/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedLayout from "@/components/ProtectedLayout";
import {Button, Card, CardBody, Container, Text, Typography} from "@/components/ui";
import { ArrowLeft, Save } from "lucide-react";
import {
    useDriverDetailsByUser,
    updateDriverDetailsByUserId,
    type DriverDetails,
} from "@/stores/driver-details";
import {
    Checkbox, CheckboxRow,
    DateInput,
    DateTimeInput,
    Grid2,
    Grid3,
    Grid4,
    NumberField,
    SectionTitle,
    Select, TextArea, TextField
} from "@/components/ui/commmon";
import {WorkingDaysSelect, Day} from "@/components/ui/WorkingDaysSelect";

/* ------------------------------- Types ------------------------------- */

type F = DriverDetails & {
    // text inputs for arrays
    chargerTypesText?: string;
    languagesListText?: string;
    serviceAreasText?: string;
    tagsText?: string;
};

/* ------------------------------- Page ------------------------------- */

export default function EditDriverDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { data, isLoading } = useDriverDetailsByUser(id);
    const [values, setValues] = useState<F | null>(null);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!data) return;
        const v: F = {
            ...data,
            chargerTypesText: (data.equipment?.chargerTypes || ""),
            languagesListText: (data.languages?.list || []).join(", "),
            serviceAreasText: (data.service?.serviceAreas || []).join(", "),
            tagsText: (data.tags || []).join(", "),
        };
        setValues(v);
    }, [data]);

    const header = useMemo(() => {
        if (!values) return "";
        const vehicle = [
            values.vehicle?.make,
            values.vehicle?.model,
            values.vehicle?.plate,
        ]
            .filter(Boolean)
            .join(" • ");
        return vehicle || "Edit Driver Details";
    }, [values]);

    if (isLoading || !values) {
        return (
            <ProtectedLayout>
                <Container className="px-3 sm:px-6 lg:px-8">
                    <div className="py-8 text-sm text-gray-600">Loading…</div>
                </Container>
            </ProtectedLayout>
        );
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);

        const payload: Partial<DriverDetails> = {
            vehicle: {
                make: values.vehicle?.make?.trim() || undefined,
                model: values.vehicle?.model?.trim() || undefined,
                year: toInt(values.vehicle?.year),
                color: values.vehicle?.color?.trim() || undefined,
                plate: values.vehicle?.plate?.trim() || undefined,
                type: values.vehicle?.type || undefined,
                vin: values.vehicle?.vin?.trim() || undefined,
                registrationExpiry: toDate(values.vehicle?.registrationExpiry),
                insurancePolicyNumber: values.vehicle?.insurancePolicyNumber?.trim() || undefined,
                insuranceExpiry: toDate(values.vehicle?.insuranceExpiry),
            },
            capacity: {
                seatsTotal: toInt(values.capacity?.seatsTotal),
                maxPassengers: toInt(values.capacity?.maxPassengers),
                luggageCapacity: toInt(values.capacity?.luggageCapacity),
            },
            features: {
                petFriendly: !!values.features?.petFriendly,
                babySeat: !!values.features?.babySeat,
                boosterSeat: !!values.features?.boosterSeat,
                wheelchairAccessible: !!values.features?.wheelchairAccessible,
                smokingAllowed: !!values.features?.smokingAllowed,
            },
            equipment: {
                chargerTypes: values.chargerTypesText,
                skiRack: !!values.equipment?.skiRack,
                bikeRack: !!values.equipment?.bikeRack,
                trunkLarge: !!values.equipment?.trunkLarge,
                climateControlZones: toInt(values.equipment?.climateControlZones),
            },
            preferences: {
                airportPermit: !!values.preferences?.airportPermit,
                nightShifts: !!values.preferences?.nightShifts,
                longDistance: !!values.preferences?.longDistance,
                corporateOnly: !!values.preferences?.corporateOnly,
            },
            languages: {
                primary: values.languages?.primary?.trim() || undefined,
                list: splitCSV(values.languagesListText),
            },
            service: {
                homeCity: values.service?.homeCity?.trim() || undefined,
                homeCoordinates: safePoint(values.service?.homeCoordinates?.coordinates),
                serviceRadiusKm: toFloat(values.service?.serviceRadiusKm),
                serviceAreas: splitCSV(values.serviceAreasText),
            },
            availability: {
                workingDays: values.availability?.workingDays || [],
                shiftStart: values.availability?.shiftStart || null,
                shiftEnd: values.availability?.shiftEnd || null,
                breaks: values.availability?.breaks || [],
            },
            pricing: {
                baseFareCents: toInt(values.pricing?.baseFareCents),
                perKmCents: toInt(values.pricing?.perKmCents),
                perMinuteCents: toInt(values.pricing?.perMinuteCents),
                surgeEligible: !!values.pricing?.surgeEligible,
            },
            compliance: {
                licenseNumber: values.compliance?.licenseNumber?.trim() || undefined,
                licenseExpiry: toDate(values.compliance?.licenseExpiry),
                backgroundCheckCleared: !!values.compliance?.backgroundCheckCleared,
                backgroundCheckedAt: toDate(values.compliance?.backgroundCheckedAt),
            },
            notes: values.notes || "",
            tags: splitCSV(values.tagsText),
        };

        try {
            await updateDriverDetailsByUserId(id, payload);
            router.push(`/driver-details/by-user/${id}`);
        } catch (err) {
            console.error(err);
            setErrors({ form: "Failed to save changes" });
            setSaving(false);
        }
    }

    return (
        <ProtectedLayout>
            <Container className="px-3 sm:px-6 lg:px-8">
                <div className="space-y-4 sm:space-y-6">
                    {/* Toolbar */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<ArrowLeft className="w-4 h-4" />}
                        >
                            <Link href={`/driver-details/${id}`}>Back</Link>
                        </Button>
                        <Typography className="text-base sm:text-2xl font-bold text-gray-900 whitespace-normal break-words leading-tight">
                            Edit • {header}
                        </Typography>
                    </div>

                    {errors.form && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {errors.form}
                        </div>
                    )}

                    <form onSubmit={onSubmit} className="space-y-6">
                        {/* Vehicle */}
                        <Card variant="elevated">
                            <CardBody className="p-4 sm:p-6 space-y-4">
                                <SectionTitle>Vehicle</SectionTitle>
                                <Grid2>
                                    <TextField id="make" label="Make" value={values.vehicle?.make} onChange={(v) => setValues(sv(values, "vehicle.make", v))} />
                                    <TextField id="model" label="Model" value={values.vehicle?.model} onChange={(v) => setValues(sv(values, "vehicle.model", v))} />
                                    <NumberField id="year" label="Year" value={values.vehicle?.year as any} onChange={(v) => setValues(sv(values, "vehicle.year", v))} />
                                    <TextField id="color" label="Color" value={values.vehicle?.color} onChange={(v) => setValues(sv(values, "vehicle.color", v))} />
                                    <TextField id="plate" label="Plate" value={values.vehicle?.plate} onChange={(v) => setValues(sv(values, "vehicle.plate", v))} />
                                    <Select
                                        id="type"
                                        label="Type"
                                        value={values.vehicle?.type || ""}
                                        onChange={(v) => setValues(sv(values, "vehicle.type", v || undefined))}
                                        options={["", "sedan", "suv", "van", "wagon", "hatchback", "pickup", "other"]}
                                    />
                                    <TextField id="vin" label="VIN" value={values.vehicle?.vin} onChange={(v) => setValues(sv(values, "vehicle.vin", v))} />
                                    <DateInput id="regExp" label="Registration Expiry" value={dateInput(values.vehicle?.registrationExpiry)} onChange={(v) => setValues(sv(values, "vehicle.registrationExpiry", v))} />
                                    <TextField id="policy" label="Insurance Policy #" value={values.vehicle?.insurancePolicyNumber} onChange={(v) => setValues(sv(values, "vehicle.insurancePolicyNumber", v))} />
                                    <DateInput id="insExp" label="Insurance Expiry" value={dateInput(values.vehicle?.insuranceExpiry)} onChange={(v) => setValues(sv(values, "vehicle.insuranceExpiry", v))} />
                                </Grid2>
                            </CardBody>
                        </Card>

                        {/* Capacity */}
                        <Card variant="elevated">
                            <CardBody className="p-4 sm:p-6">
                                <SectionTitle>Capacity</SectionTitle>
                                <Grid3>
                                    <NumberField id="seats" label="Seats Total" value={values.capacity?.seatsTotal as any} onChange={(v) => setValues(sv(values, "capacity.seatsTotal", v))} />
                                    <NumberField id="maxPax" label="Max Passengers" value={values.capacity?.maxPassengers as any} onChange={(v) => setValues(sv(values, "capacity.maxPassengers", v))} />
                                    <NumberField id="luggage" label="Luggage Capacity" value={values.capacity?.luggageCapacity as any} onChange={(v) => setValues(sv(values, "capacity.luggageCapacityLiters", v))} />
                                </Grid3>
                            </CardBody>
                        </Card>

                        {/* Features + Equipment */}
                        <Card variant="elevated">
                            <CardBody className="p-4 sm:p-6 space-y-6">
                                <SectionTitle>Features</SectionTitle>
                                <CheckboxRow
                                    items={[
                                        ["Pet Friendly", !!values.features?.petFriendly, (v) => setValues(sv(values, "features.petFriendly", v))],
                                        ["Baby Seat", !!values.features?.babySeat, (v) => setValues(sv(values, "features.babySeat", v))],
                                        ["Booster Seat", !!values.features?.boosterSeat, (v) => setValues(sv(values, "features.boosterSeat", v))],
                                        ["Wheelchair Accessible", !!values.features?.wheelchairAccessible, (v) => setValues(sv(values, "features.wheelchairAccessible", v))],
                                        ["Smoking Allowed", !!values.features?.smokingAllowed, (v) => setValues(sv(values, "features.smokingAllowed", v))],
                                    ]}
                                />
                                <SectionTitle>Equipment</SectionTitle>
                                <Grid3>
                                    <TextField id="chargers" label="Charger Types (comma-separated)" value={values.chargerTypesText || ""} onChange={(v) => setValues({ ...values, chargerTypesText: v })} />
                                    <NumberField id="climateZones" label="Climate Zones" value={values.equipment?.climateControlZones as any} onChange={(v) => setValues(sv(values, "equipment.climateControlZones", v))} />
                                </Grid3>
                                <CheckboxRow
                                    items={[
                                        ["Ski Rack", !!values.equipment?.skiRack, (v) => setValues(sv(values, "equipment.skiRack", v))],
                                        ["Bike Rack", !!values.equipment?.bikeRack, (v) => setValues(sv(values, "equipment.bikeRack", v))],
                                        ["Large Trunk", !!values.equipment?.trunkLarge, (v) => setValues(sv(values, "equipment.trunkLarge", v))],
                                    ]}
                                />
                            </CardBody>
                        </Card>

                        {/* Preferences + Languages */}
                        <Card variant="elevated">
                            <CardBody className="p-4 sm:p-6 space-y-6">
                                <SectionTitle>Preferences</SectionTitle>
                                <CheckboxRow
                                    items={[
                                        ["Airport Permit", !!values.preferences?.airportPermit, (v) => setValues(sv(values, "preferences.airportPermit", v))],
                                        ["Night Shifts", !!values.preferences?.nightShifts, (v) => setValues(sv(values, "preferences.nightShifts", v))],
                                        ["Long Distance", !!values.preferences?.longDistance, (v) => setValues(sv(values, "preferences.longDistance", v))],
                                        ["Corporate Only", !!values.preferences?.corporateOnly, (v) => setValues(sv(values, "preferences.corporateOnly", v))],
                                    ]}
                                />
                                <SectionTitle>Languages</SectionTitle>
                                <Grid2>
                                    <TextField id="langPrimary" label="Primary Language (ISO 639-1)" value={values.languages?.primary || ""} onChange={(v) => setValues(sv(values, "languages.primary", v))} />
                                    <TextField id="langList" label="Other Languages (comma-separated)" value={values.languagesListText || ""} onChange={(v) => setValues({ ...values, languagesListText: v })} />
                                </Grid2>
                            </CardBody>
                        </Card>

                        {/* Service + Availability */}
                        <Card variant="elevated">
                            <CardBody className="p-4 sm:p-6 space-y-6">
                                <SectionTitle>Service</SectionTitle>
                                <Grid3>
                                    <TextField id="homeCity" label="Home City" value={values.service?.homeCity || ""} onChange={(v) => setValues(sv(values, "service.homeCity", v))} />
                                    <TextField id="homeLonLat" label="Home Coords (lon,lat)" value={coordsText(values.service?.homeCoordinates?.coordinates)} onChange={(v) => setValues(sv(values, "service.homeCoordinates", parsePoint(v)))} />
                                    <NumberField id="radius" label="Service Radius (km)" value={values.service?.serviceRadiusKm as any} onChange={(v) => setValues(sv(values, "service.serviceRadiusKm", v))} />
                                    <TextField id="areas" label="Service Areas (comma-separated)" value={values.serviceAreasText || ""} onChange={(v) => setValues({ ...values, serviceAreasText: v })} />
                                </Grid3>

                                <SectionTitle>Availability</SectionTitle>
                                <Grid3>
                                    <WorkingDaysSelect
                                        value={values.availability.workingDays ?? []}
                                        onChange={(days: Day[]) => setValues(sv(values, "availability.workingDays", days))}
                                    />
                                    <TextField id="shiftStart" label="Shift Start (HH:mm)" value={values.availability?.shiftStart || ""} onChange={(v) => setValues(sv(values, "availability.shiftStart", v || null))} />
                                    <TextField id="shiftEnd" label="Shift End (HH:mm)" value={values.availability?.shiftEnd || ""} onChange={(v) => setValues(sv(values, "availability.shiftEnd", v || null))} />
                                </Grid3>
                            </CardBody>
                        </Card>

                        {/* Pricing + Compliance */}
                        <Card variant="elevated">
                            <CardBody className="p-4 sm:p-6 space-y-6">
                                <SectionTitle>Pricing</SectionTitle>
                                <Grid4>
                                    <NumberField id="baseFare" label="Base Fare (cents)" value={values.pricing?.baseFareCents as any} onChange={(v) => setValues(sv(values, "pricing.baseFareCents", v))} />
                                    <NumberField id="perKm" label="Per Km (cents)" value={values.pricing?.perKmCents as any} onChange={(v) => setValues(sv(values, "pricing.perKmCents", v))} />
                                    <NumberField id="perMin" label="Per Minute (cents)" value={values.pricing?.perMinuteCents as any} onChange={(v) => setValues(sv(values, "pricing.perMinuteCents", v))} />
                                    <Checkbox id="surge" label="Surge Eligible" checked={!!values.pricing?.surgeEligible} onChange={(v) => setValues(sv(values, "pricing.surgeEligible", v))} />
                                </Grid4>

                                <SectionTitle>Compliance</SectionTitle>
                                <Grid3>
                                    <TextField id="licenseNum" label="License #" value={values.compliance?.licenseNumber || ""} onChange={(v) => setValues(sv(values, "compliance.licenseNumber", v))} />
                                    <DateInput id="licenseExp" label="License Expiry" value={dateInput(values.compliance?.licenseExpiry)} onChange={(v) => setValues(sv(values, "compliance.licenseExpiry", v))} />
                                    <Checkbox id="bg" label="Background Check Cleared" checked={!!values.compliance?.backgroundCheckCleared} onChange={(v) => setValues(sv(values, "compliance.backgroundCheckCleared", v))} />
                                    <DateTimeInput id="bgAt" label="Background Checked At" value={datetimeInput(values.compliance?.backgroundCheckedAt)} onChange={(v) => setValues(sv(values, "compliance.backgroundCheckedAt", v))} />
                                </Grid3>
                            </CardBody>
                        </Card>

                        {/* Notes + Tags */}
                        <Card variant="elevated">
                            <CardBody className="p-4 sm:p-6 space-y-4">
                                <SectionTitle>Notes & Tags</SectionTitle>
                                <TextArea id="notes" label="Notes" rows={4} value={values.notes || ""} onChange={(v) => setValues({ ...values, notes: v })} />
                                <TextField id="tags" label="Tags (comma-separated)" value={values.tagsText || ""} onChange={(v) => setValues({ ...values, tagsText: v })} />
                            </CardBody>
                        </Card>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                            <Button variant="outline">
                                <Link href={`/driver-details/${id}`}>Cancel</Link>
                            </Button>
                            <Button type="submit" leftIcon={<Save className="w-4 h-4" />} disabled={saving}>
                                {saving ? "Saving…" : "Save Changes"}
                            </Button>
                        </div>
                    </form>
                </div>
            </Container>
        </ProtectedLayout>
    );
}

/* ------------------------------ Utilities ----------------------------- */

function sv<T extends object>(obj: T, path: string, value: any): T {
    const out: any = Array.isArray(obj) ? [...(obj as any)] : { ...(obj as any) };
    const parts = path.split(".");
    let cur = out;
    for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i]!;
        cur[p] = cur[p] ?? {};
        cur = cur[p];
    }
    cur[parts[parts.length - 1]!] = value;
    return out;
}
function toInt(x: any): number | undefined {
    const n = Number(x);
    return Number.isFinite(n) ? n : undefined;
}
function toFloat(x: any): number | undefined {
    const n = Number(x);
    return Number.isFinite(n) ? n : undefined;
}
function toDate(x: any): string | undefined {
    if (!x) return undefined;
    const d = new Date(x);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
}
function splitCSV(s?: string): string[] | undefined {
    if (!s) return [];
    return s
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
}
function dateInput(iso?: string | null): string | undefined {
    if (!iso) return undefined;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return undefined;
    // yyyy-mm-dd
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function datetimeInput(iso?: string | null): string | undefined {
    if (!iso) return undefined;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return undefined;
    // yyyy-mm-ddThh:mm
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
}
function safePoint(coords?: [number, number]) {
    if (!coords || coords.length !== 2) return undefined;
    const [lon, lat] = coords;
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return undefined;
    return { type: "Point" as const, coordinates: [lon, lat] as [number, number] };
}
function parsePoint(text: string) {
    const parts = (text || "").split(",").map((t) => t.trim());
    if (parts.length !== 2) return undefined as any;
    const lon = Number(parts[0]);
    const lat = Number(parts[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return undefined as any;
    return { type: "Point" as const, coordinates: [lon, lat] as [number, number] };
}
function coordsText(coords?: [number, number]) {
    if (!coords || coords.length !== 2) return "";
    const [lon, lat] = coords;
    return `${lon},${lat}`;
}
