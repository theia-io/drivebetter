"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import {
    ArrowLeft,
    PencilLine,
    Trash2,
    Car,
    CircleUser,
    Languages,
    MapPin,
    Settings,
    FileText,
    Shield,
    GaugeCircle, CalendarIcon,
} from "lucide-react";
import {
    useDriverDetailsByUser,
    deleteDriverDetails,
    removeDriverDocument,
    type DriverDetails,
} from "@/stores/driver-details";
import {arr, coords, DollarIcon, dt, KV, money, num, Section, bool} from "@/components/ui/commmon";

export default function DriverDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { data, isLoading, mutate } = useDriverDetailsByUser(id);
    const dd = data as DriverDetails | undefined;

    const header = useMemo(() => {
        if (!dd) return "";
        const name = (dd as any).user?.name || ""; // if your API populates user, otherwise leave blank
        const vehicle =
            [dd.vehicle?.make, dd.vehicle?.model, dd.vehicle?.plate].filter(Boolean).join(" • ") ||
            "Vehicle";
        return name ? `${name} — ${vehicle}` : vehicle;
    }, [dd]);

    async function onDelete() {
        // eslint-disable-next-line no-alert
        const ok = confirm("Delete driver details?");
        if (!ok) return;
        await deleteDriverDetails(id);
        router.push("/driver-details"); // adjust if your index differs
    }

    async function onRemoveDoc(docId: string) {
        // eslint-disable-next-line no-alert
        const ok = confirm("Remove this document?");
        if (!ok) return;
        await removeDriverDocument(id, docId);
        await mutate();
    }

    // Basic guard
    if (isLoading) {
        return (
            <ProtectedLayout>
                <Container className="px-3 sm:px-6 lg:px-8">
                    <div className="py-8 text-sm text-gray-600">Loading…</div>
                </Container>
            </ProtectedLayout>
        );
    }
    if (!dd) {
        return (
            <ProtectedLayout>
                <Container className="px-3 sm:px-6 lg:px-8">
                    <div className="py-8 text-sm text-gray-600">Not found</div>
                </Container>
            </ProtectedLayout>
        );
    }

    return (
        <ProtectedLayout>
            <Container className="px-3 sm:px-6 lg:px-8">
                <div className="space-y-4 sm:space-y-6">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<ArrowLeft className="w-4 h-4" />}
                                onClick={() => router.back()}
                            >
                                Back
                            </Button>
                            <Typography className="text-base sm:text-2xl font-bold text-gray-900 whitespace-normal break-words leading-tight">
                                {header}
                            </Typography>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link href={`/driver-details/by-user/${id}/edit`}>
                                <Button variant="outline" size="sm" leftIcon={<PencilLine className="w-4 h-4" />}>
                                    Edit
                                </Button>
                            </Link>
                            <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<Trash2 className="w-4 h-4" />}
                                onClick={onDelete}
                            >
                                Delete
                            </Button>
                        </div>
                    </div>

                    {/* Vehicle + Capacity */}
                    <Card variant="elevated">
                        <CardBody className="p-4 sm:p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <Section title="Vehicle" icon={<Car className="w-4 h-4" />}>
                                    <KV k="Make" v={dd.vehicle?.make} />
                                    <KV k="Model" v={dd.vehicle?.model} />
                                    <KV k="Year" v={num(dd.vehicle?.year)} />
                                    <KV k="Color" v={dd.vehicle?.color} />
                                    <KV k="Plate" v={dd.vehicle?.plate} />
                                    <KV k="Type" v={dd.vehicle?.type} />
                                    <KV k="VIN" v={dd.vehicle?.vin} />
                                    <KV k="Reg. Expiry" v={dt(dd.vehicle?.registrationExpiry)} />
                                    <KV k="Policy #" v={dd.vehicle?.insurancePolicyNumber} />
                                    <KV k="Ins. Expiry" v={dt(dd.vehicle?.insuranceExpiry)} />
                                </Section>

                                <Section title="Capacity" icon={<GaugeCircle className="w-4 h-4" />}>
                                    <KV k="Seats" v={num(dd.capacity?.seatsTotal)} />
                                    <KV k="Max Passengers" v={num(dd.capacity?.maxPassengers)} />
                                    <KV k="Luggage" v={num(dd.capacity?.luggageCapacity)} />
                                </Section>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Features + Equipment */}
                    <Card variant="elevated">
                        <CardBody className="p-4 sm:p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <Section title="Features" icon={<Settings className="w-4 h-4" />}>
                                    <KV k="Pet Friendly" v={bool(dd.features?.petFriendly)} />
                                    <KV k="Baby Seat" v={bool(dd.features?.babySeat)} />
                                    <KV k="Booster Seat" v={bool(dd.features?.boosterSeat)} />
                                    <KV k="Wheelchair Accessible" v={bool(dd.features?.wheelchairAccessible)} />
                                    <KV k="Smoking Allowed" v={bool(dd.features?.smokingAllowed)} />
                                </Section>

                                <Section title="Equipment" icon={<Settings className="w-4 h-4" />}>
                                    <KV k="Charger Types" v={dd.equipment?.chargerTypes} />
                                    <KV k="Ski Rack" v={bool(dd.equipment?.skiRack)} />
                                    <KV k="Bike Rack" v={bool(dd.equipment?.bikeRack)} />
                                    <KV k="Large Trunk" v={bool(dd.equipment?.trunkLarge)} />
                                    <KV k="Climate Zones" v={num(dd.equipment?.climateControlZones)} />
                                </Section>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Preferences + Languages */}
                    <Card variant="elevated">
                        <CardBody className="p-4 sm:p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <Section title="Preferences" icon={<Settings className="w-4 h-4" />}>
                                    <KV k="Airport Permit" v={bool(dd.preferences?.airportPermit)} />
                                    <KV k="Night Shifts" v={bool(dd.preferences?.nightShifts)} />
                                    <KV k="Long Distance" v={bool(dd.preferences?.longDistance)} />
                                    <KV k="Corporate Only" v={bool(dd.preferences?.corporateOnly)} />
                                </Section>

                                <Section title="Languages" icon={<Languages className="w-4 h-4" />}>
                                    <KV k="Primary" v={dd.languages?.primary} />
                                    <KV k="Other" v={arr(dd.languages?.list)} />
                                </Section>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Service + Availability */}
                    <Card variant="elevated">
                        <CardBody className="p-4 sm:p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <Section title="Service Area" icon={<MapPin className="w-4 h-4" />}>
                                    <KV k="Home City" v={dd.service?.homeCity} />
                                    <KV
                                        k="Home Coords"
                                        v={coords(dd.service?.homeCoordinates?.coordinates)}
                                    />
                                    <KV k="Radius (km)" v={num(dd.service?.serviceRadiusKm)} />
                                    <KV k="Areas" v={arr(dd.service?.serviceAreas)} />
                                </Section>

                                <Section title="Availability" icon={<CalendarIcon />}>
                                    <KV k="Working Days" v={arr(dd.availability?.workingDays)} />
                                    <KV k="Shift Start" v={dd.availability?.shiftStart || "—"} />
                                    <KV k="Shift End" v={dd.availability?.shiftEnd || "—"} />
                                    <KV
                                        k="Breaks"
                                        v={
                                            dd.availability?.breaks?.length
                                                ? dd.availability.breaks.map((b) => `${b.start}–${b.end}`).join(", ")
                                                : "—"
                                        }
                                    />
                                </Section>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Pricing + Compliance */}
                    <Card variant="elevated">
                        <CardBody className="p-4 sm:p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <Section title="Pricing" icon={<DollarIcon />}>
                                    <KV k="Base Fare" v={money(dd.pricing?.baseFareCents)} />
                                    <KV k="Per Km" v={money(dd.pricing?.perKmCents)} />
                                    <KV k="Per Minute" v={money(dd.pricing?.perMinuteCents)} />
                                    <KV k="Surge Eligible" v={bool(dd.pricing?.surgeEligible)} />
                                </Section>

                                <Section title="Compliance" icon={<Shield className="w-4 h-4" />}>
                                    <KV k="License #" v={dd.compliance?.licenseNumber} />
                                    <KV k="License Expiry" v={dt(dd.compliance?.licenseExpiry)} />
                                    <KV
                                        k="Background Check"
                                        v={dd.compliance?.backgroundCheckCleared ? "Cleared" : "Pending"}
                                    />
                                    <KV k="Checked At" v={dt(dd.compliance?.backgroundCheckedAt)} />
                                </Section>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Documents */}
                    <Card variant="elevated">
                        <CardBody className="p-4 sm:p-6">
                            <div className="flex items-center gap-2 mb-3">
                                <FileText className="w-4 h-4 text-gray-500" />
                                <Typography className="font-semibold text-gray-900">Documents</Typography>
                            </div>
                            <div className="space-y-2">
                                {(dd.documents || []).length === 0 && (
                                    <div className="text-sm text-gray-600">No documents</div>
                                )}
                                {(dd.documents || []).map((doc) => (
                                    <div
                                        key={(doc as any)._id || `${doc.type}-${doc.url}`}
                                        className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                                    >
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium text-gray-900">
                                                {doc.type} • {doc.url}
                                            </div>
                                            <div className="text-xs text-gray-600">
                                                Uploaded {dt(doc.uploadedAt)}{doc.expiresAt ? ` • Expires ${dt(doc.expiresAt)}` : ""}
                                                {doc.note ? ` • ${doc.note}` : ""}
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            leftIcon={<Trash2 className="w-4 h-4" />}
                                            onClick={() => onRemoveDoc((doc as any)._id)}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardBody>
                    </Card>

                    {/* Meta */}
                    <Card variant="elevated">
                        <CardBody className="p-4 sm:p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <Section title="Stats" icon={<CircleUser className="w-4 h-4" />}>
                                    <KV k="Rating Avg" v={num(dd.stats?.ratingAvg)} />
                                    <KV k="Rating Count" v={num(dd.stats?.ratingCount)} />
                                    <KV k="Completed Rides" v={num(dd.stats?.completedRides)} />
                                    <KV k="Cancellations" v={num(dd.stats?.cancellations)} />
                                    <KV k="Last Active" v={dt(dd.stats?.lastActiveAt)} />
                                </Section>
                                <Section title="Notes / Tags" icon={<CircleUser className="w-4 h-4" />}>
                                    <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-700 bg-white min-h-[44px]">
                                        {dd.notes?.trim() || "—"}
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {(dd.tags || []).length
                                            ? dd.tags!.map((t) => (
                                                <span
                                                    key={t}
                                                    className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-700"
                                                >
                            {t}
                          </span>
                                            ))
                                            : <span className="text-sm text-gray-600">No tags</span>}
                                    </div>
                                </Section>
                            </div>
                            <div className="mt-4 text-xs text-gray-500">
                                Created {dt(dd.createdAt)} • Updated {dt(dd.updatedAt)}
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </Container>
        </ProtectedLayout>
    );
}
