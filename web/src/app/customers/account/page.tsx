// app/customers/account/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    User as UserIcon,
    Phone,
    Mail,
    Calendar,
    UserCheck,
    Loader2,
    PencilLine,
    Car,
    Clock,
} from "lucide-react";

import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import { useAuthStore } from "@/stores/auth";
import {
    useCustomerMe,
    updateCustomerMe,
    type CustomerMeResponse,
} from "@/stores/customers";

function fmtDate(iso?: string | null) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString();
}

export default function CustomerAccountPage() {
    const router = useRouter();
    const { user: authUser, fetchMe } = useAuthStore();
    const { data, isLoading, error, mutate } = useCustomerMe();

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [age, setAge] = useState("");

    // Load auth user if not present and enforce client role
    useEffect(() => {
        (async () => {
            const current: any = authUser || (await fetchMe());
            if (!current) {
                router.push("/login");
                return;
            }
            const roles: string[] = current.roles || [];
            if (!roles.includes("customer")) {
                router.push("/");
            }
        })();
    }, [authUser, fetchMe, router]);

    // Sync form from API data
    useEffect(() => {
        if (!data) return;
        const u: any = data.user;
        const p = data.profile;

        setName(u?.name || "");
        setPhone(u?.phone || "");
        setAge(
            typeof p?.age === "number" && !Number.isNaN(p.age) ? String(p.age) : "",
        );
    }, [data]);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaveError(null);

        const ageNum =
            age.trim() === "" ? undefined : Number.parseInt(age.trim(), 10);
        if (ageNum != null && Number.isNaN(ageNum)) {
            setSaveError("Age must be a number.");
            return;
        }

        setSaving(true);
        try {
            const payload: { name?: string; phone?: string; age?: number } = {};
            payload.name = name.trim();
            payload.phone = phone.trim() || undefined;
            if (ageNum != null) payload.age = ageNum;

            const updated: CustomerMeResponse = await updateCustomerMe(payload);
            await mutate(updated, false);
        } catch (err: any) {
            setSaveError(err?.message || "Failed to save changes.");
        } finally {
            setSaving(false);
        }
    }

    const u: any = data?.user;
    const p = data?.profile;
    const invitedBy = data?.invitedBy;

    const customerId = u?._id;

    return (
        <ProtectedLayout>
            <Container className="px-3 sm:px-4 lg:px-8 py-3 sm:py-4 lg:py-6">
                <div className="space-y-4 sm:space-y-6">
                    {/* Header */}
                    <div className="rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 p-4 sm:p-5">
                        <div className="flex items-start gap-3 sm:gap-4">
                            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-indigo-600 text-white">
                                <UserIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                            </div>
                            <div className="min-w-0 space-y-1">
                                <Typography className="text-[11px] font-medium uppercase tracking-wide text-gray-600">
                                    Customer account
                                </Typography>
                                <Typography
                                    as="h1"
                                    className="text-base sm:text-2xl font-semibold text-gray-900 leading-snug break-words"
                                >
                                    {u?.name || "Your account"}
                                </Typography>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-700">
                                    {u?.email && (
                                        <span className="inline-flex items-center gap-1">
                                            <Mail className="h-3.5 w-3.5 text-gray-400" />
                                            {u.email}
                                        </span>
                                    )}
                                    {u?.phone && (
                                        <span className="inline-flex items-center gap-1">
                                            <Phone className="h-3.5 w-3.5 text-gray-400" />
                                            {u.phone}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Loading / error */}
                    {isLoading && (
                        <Card className="rounded-2xl">
                            <CardBody className="p-4 sm:p-5">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                    <span>Loading your account…</span>
                                </div>
                            </CardBody>
                        </Card>
                    )}

                    {error && !isLoading && (
                        <Card className="rounded-2xl border-red-200 bg-red-50">
                            <CardBody className="p-4 sm:p-5">
                                <Typography className="text-sm text-red-800">
                                    Failed to load your customer profile.
                                </Typography>
                            </CardBody>
                        </Card>
                    )}

                    {!isLoading && !error && data && (
                        <>
                            {/* Basic info + edit form */}
                            <Card className="rounded-2xl">
                                <CardBody className="p-4 sm:p-5 space-y-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
                                                <UserCheck className="h-4 w-4 text-indigo-600" />
                                            </div>
                                            <Typography className="text-sm font-semibold text-gray-900">
                                                Basic information
                                            </Typography>
                                        </div>
                                    </div>

                                    <form
                                        onSubmit={handleSave}
                                        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                                    >
                                        <div className="space-y-1">
                                            <label className="block text-xs font-medium text-gray-700">
                                                Full name
                                            </label>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="block w-full rounded-lg border border-gray-300 bg-gray-50 py-2 px-3 text-sm text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="block text-xs font-medium text-gray-700">
                                                Phone number
                                            </label>
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                className="block w-full rounded-lg border border-gray-300 bg-gray-50 py-2 px-3 text-sm text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
                                                placeholder="+1 555 123 4567"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="block text-xs font-medium text-gray-700">
                                                Age
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                max={120}
                                                value={age}
                                                onChange={(e) => setAge(e.target.value)}
                                                className="block w-full rounded-lg border border-gray-300 bg-gray-50 py-2 px-3 text-sm text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="block text-xs font-medium text-gray-700">
                                                Member since
                                            </label>
                                            <div className="flex items-center gap-1.5 text-sm text-gray-800">
                                                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                                <span>{fmtDate(u?.createdAt)}</span>
                                            </div>
                                        </div>

                                        {saveError && (
                                            <div className="col-span-full rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800">
                                                {saveError}
                                            </div>
                                        )}

                                        <div className="col-span-full flex justify-end">
                                            <Button
                                                type="submit"
                                                size="sm"
                                                loading={saving}
                                                leftIcon={
                                                    !saving ? (
                                                        <PencilLine className="h-4 w-4" />
                                                    ) : undefined
                                                }
                                            >
                                                Save changes
                                            </Button>
                                        </div>
                                    </form>
                                </CardBody>
                            </Card>

                            {/* Invited by, rides summary */}
                            <Card className="rounded-2xl">
                                <CardBody className="p-4 sm:p-5 space-y-4">
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        {/* Invited by */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50">
                                                    <UserIcon className="h-4 w-4 text-sky-600" />
                                                </div>
                                                <Typography className="text-sm font-semibold text-gray-900">
                                                    Invited by
                                                </Typography>
                                            </div>
                                            {invitedBy ? (
                                                <div className="ml-1.5 space-y-1 text-sm text-gray-800">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className="font-medium">
                                                            {invitedBy.name ||
                                                                invitedBy.email ||
                                                                invitedBy._id}
                                                        </span>
                                                    </div>
                                                    {invitedBy.email && (
                                                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                                            <Mail className="h-3.5 w-3.5 text-gray-400" />
                                                            <span>{invitedBy.email}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <Typography className="ml-1.5 text-sm text-gray-500">
                                                    Inviter information is not available.
                                                </Typography>
                                            )}
                                        </div>

                                        {/* Rides */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                                                    <Car className="h-4 w-4 text-emerald-600" />
                                                </div>
                                                <Typography className="text-sm font-semibold text-gray-900">
                                                    Rides
                                                </Typography>
                                            </div>
                                            <div className="ml-1.5 space-y-2 text-sm text-gray-800">
                                                <p className="text-xs text-gray-600">
                                                    You can request a ride or review your past
                                                    rides.
                                                </p>
                                                <div className="flex flex-col gap-2 sm:flex-row">
                                                    <Link
                                                        href={`/rides/new${
                                                            customerId
                                                                ? `?customerId=${encodeURIComponent(
                                                                      customerId,
                                                                  )}`
                                                                : ""
                                                        }`}
                                                        className="sm:flex-1"
                                                    >
                                                        <Button
                                                            size="sm"
                                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                                        >
                                                            <Car className="h-4 w-4 mr-1.5" />
                                                            Request a ride
                                                        </Button>
                                                    </Link>
                                                    <Link
                                                        href={`/rides${
                                                            customerId
                                                                ? `?customerId=${encodeURIComponent(
                                                                      customerId,
                                                                  )}`
                                                                : ""
                                                        }`}
                                                        className="sm:flex-1"
                                                    >
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="w-full"
                                                        >
                                                            <Clock className="h-4 w-4 mr-1.5" />
                                                            Ride history
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        </>
                    )}
                </div>
            </Container>
        </ProtectedLayout>
    );
}
