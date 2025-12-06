// app/customers/page.tsx
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
    UserPlus,
    Users,
    Mail,
    Phone,
    CalendarClock,
    Car,
    Clock,
    Loader2,
    Info,
} from "lucide-react";

import ProtectedLayout from "@/components/ProtectedLayout";
import { useAuthStore } from "@/stores/auth";
import {
    createCustomerInvite,
    useMyCustomers,
    useMyCustomerInvites,
    useCustomerRides,
    type MyCustomer,
    type MyCustomerInvite,
} from "@/stores/customers";
import { Button } from "@/components/ui";
import CustomerCard from "@/app/customers/components/CustomerCard";
import CustomerInvitesAccordion from "@/app/customers/components/CustomerInvitesAccordion";

type InviteFormState = {
    email: string;
    message: string;
    expiresAt: string;
};

function formatDate(iso?: string | null) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString();
}

export default function CustomersPage() {
    const { user } = useAuthStore();

    const {
        data: customers,
        isLoading: loadingCustomers,
        error: customersError,
        mutate: reloadCustomers,
    } = useMyCustomers();

    const {
        data: invites,
        isLoading: loadingInvites,
        error: invitesError,
        mutate: reloadInvites,
    } = useMyCustomerInvites();

    const [inviteForm, setInviteForm] = useState<InviteFormState>({
        email: "",
        message: "",
        expiresAt: "",
    });
    const [inviteOpen, setInviteOpen] = useState(true);
    const [inviting, setInviting] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

    async function handleInviteSubmit(e: React.FormEvent) {
        e.preventDefault();
        setInviteError(null);
        setInviteSuccess(null);

        if (!inviteForm.email.trim()) {
            setInviteError("Email is required.");
            return;
        }

        setInviting(true);
        try {
            await createCustomerInvite({
                email: inviteForm.email.trim(),
                message: inviteForm.message.trim() || undefined,
                expiresAt: inviteForm.expiresAt
                    ? new Date(inviteForm.expiresAt).toISOString()
                    : undefined,
            });

            setInviteSuccess("Invitation created.");
            setInviteForm({
                email: "",
                message: "",
                expiresAt: "",
            });
            await Promise.all([reloadCustomers(), reloadInvites()]);
        } catch (err: any) {
            setInviteError(err?.message || "Failed to create invite.");
        } finally {
            setInviting(false);
        }
    }

    const pendingInvites =
        invites?.filter((i) => i.status === "pending") ?? [];
    const usedInvites =
        invites?.filter((i) => i.status === "used") ?? [];
    const expiredInvites =
        invites?.filter((i) => i.status === "expired") ?? [];

    // ---------- Aggregated rides stats across all customers ----------
    const {
        totalCustomers,
        registeredCustomers,
        invitedCustomers,
        totalRides,
        lastRideGlobal,
    } = useMemo(() => {
        if (!customers || customers.length === 0) {
            return {
                totalCustomers: 0,
                registeredCustomers: 0,
                invitedCustomers: 0,
                totalRides: 0,
                lastRideGlobal: null as Date | null,
            };
        }

        let registered = 0;
        let rides = 0;
        let lastRide: Date | null = null;

        for (const c of customers as MyCustomer[]) {
            const u: any = c.user;
            const s: any = c.stats;

            if (u) registered += 1;

            if (typeof s?.ridesTotal === "number") {
                rides += s.ridesTotal;
            }

            if (s?.lastRideAt) {
                const d = new Date(s.lastRideAt);
                if (!Number.isNaN(d.getTime())) {
                    if (!lastRide || d > lastRide) {
                        lastRide = d;
                    }
                }
            }
        }

        const total = customers.length;
        const invited = total - registered;

        return {
            totalCustomers: total,
            registeredCustomers: registered,
            invitedCustomers: invited,
            totalRides: rides,
            lastRideGlobal: lastRide,
        };
    }, [customers]);

    return (
        <ProtectedLayout>
            <div className="w-full bg-gray-50">
                <div className="mx-auto flex max-w-6xl flex-col gap-4 px-3 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
                    {/* Header */}
                    <header className="rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 p-4 sm:p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 space-y-1">
                                <h1 className="text-xl font-semibold leading-tight text-gray-900 sm:text-2xl">
                                    Customers
                                </h1>
                                <p className="text-sm text-gray-600">
                                    Manage invited customers, create rides for them, and review their history.
                                </p>
                            </div>
                        </div>
                    </header>

                    {/* Invite card */}
                    <section className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
                        <button
                            type="button"
                            onClick={() => setInviteOpen((v) => !v)}
                            className="flex w-full items-center justify-between text-left"
                        >
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50">
                                    <UserPlus className="h-4 w-4 text-sky-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">
                                        Invite new customer
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Send a personal email invite so they can register.
                                    </p>
                                </div>
                            </div>
                            <span className="text-xs font-medium text-gray-500">
                                {inviteOpen ? "Hide" : "Show"}
                            </span>
                        </button>

                        {inviteOpen && (
                            <form
                                onSubmit={handleInviteSubmit}
                                className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,2fr)_auto] sm:items-end"
                            >
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-gray-700">
                                        Customer email
                                    </label>
                                    <div className="relative">
                                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                            <Mail className="h-4 w-4" />
                                        </span>
                                        <input
                                            type="email"
                                            required
                                            value={inviteForm.email}
                                            onChange={(e) =>
                                                setInviteForm((f) => ({
                                                    ...f,
                                                    email: e.target.value,
                                                }))
                                            }
                                            className="block w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-sky-500 focus:ring-sky-500"
                                            placeholder="customer@example.com"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-gray-700">
                                        Message (optional)
                                    </label>
                                    <textarea
                                        rows={1}
                                        value={inviteForm.message}
                                        onChange={(e) =>
                                            setInviteForm((f) => ({
                                                ...f,
                                                message: e.target.value,
                                            }))
                                        }
                                        className="block w-full resize-none rounded-lg border border-gray-300 bg-gray-50 py-2 px-3 text-sm text-gray-900 focus:border-sky-500 focus:ring-sky-500"
                                        placeholder="Short note to your customer"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-gray-700">
                                        Expires at (optional)
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={inviteForm.expiresAt}
                                        onChange={(e) =>
                                            setInviteForm((f) => ({
                                                ...f,
                                                expiresAt: e.target.value,
                                            }))
                                        }
                                        className="block w-full rounded-lg border border-gray-300 bg-gray-50 py-2 px-3 text-sm text-gray-900 focus:border-sky-500 focus:ring-sky-500"
                                    />
                                </div>

                                <div className="flex items-end justify-end">
                                    <Button
                                        type="submit"
                                        disabled={inviting}
                                        colorScheme="primary"
                                        className="inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                                    >
                                        {inviting && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )}
                                        Send invite
                                    </Button>
                                </div>

                                {(inviteError || inviteSuccess) && (
                                    <div className="col-span-full mt-1 text-xs">
                                        {inviteError && (
                                            <p className="text-red-600">{inviteError}</p>
                                        )}
                                        {inviteSuccess && (
                                            <p className="text-emerald-600">
                                                {inviteSuccess}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </form>
                        )}
                    </section>

                    <CustomerInvitesAccordion userName={user?.name} />

                    {/* Customers list */}
                    <section className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
                                    <Users className="h-4 w-4 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">
                                        Your customers
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Customers invited by{" "}
                                        <span className="font-medium">
                                            {user?.name || "you"}
                                        </span>
                                        .
                                    </p>
                                </div>
                            </div>
                            {customers && customers.length > 0 && (
                                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600">
                                    {customers.length} total
                                </span>
                            )}
                        </div>

                        {/* Aggregated rides stats strip */}
                        {!loadingCustomers &&
                            !customersError &&
                            customers &&
                            customers.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mt-1">
                                    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                                        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-gray-500">
                                            <Users className="h-3.5 w-3.5 text-gray-400" />
                                            <span>Customers</span>
                                        </div>
                                        <div className="mt-1 text-lg font-semibold text-gray-900">
                                            {totalCustomers}
                                        </div>
                                        <div className="mt-0.5 text-[11px] text-gray-500">
                                            {registeredCustomers} registered,{" "}
                                            {invitedCustomers} invited
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                                        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-gray-500">
                                            <Car className="h-3.5 w-3.5 text-gray-400" />
                                            <span>Total rides</span>
                                        </div>
                                        <div className="mt-1 text-lg font-semibold text-gray-900">
                                            {totalRides}
                                        </div>
                                        <div className="mt-0.5 text-[11px] text-gray-500">
                                            Across all customers
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                                        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-gray-500">
                                            <CalendarClock className="h-3.5 w-3.5 text-gray-400" />
                                            <span>Last ride</span>
                                        </div>
                                        <div className="mt-1 text-sm font-semibold text-gray-900">
                                            {lastRideGlobal
                                                ? lastRideGlobal.toLocaleDateString()
                                                : "—"}
                                        </div>
                                        <div className="mt-0.5 text-[11px] text-gray-500">
                                            Most recent ride date
                                        </div>
                                    </div>

                                    <div className="hidden sm:block rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                                        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-gray-500">
                                            <Clock className="h-3.5 w-3.5 text-gray-400" />
                                            <span>Invites</span>
                                        </div>
                                        <div className="mt-1 text-lg font-semibold text-gray-900">
                                            {invites?.length ?? 0}
                                        </div>
                                        <div className="mt-0.5 text-[11px] text-gray-500">
                                            Total invites sent
                                        </div>
                                    </div>
                                </div>
                            )}

                        {loadingCustomers && (
                            <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-3 py-3 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                    <span>Loading customers…</span>
                                </div>
                            </div>
                        )}

                        {customersError && !loadingCustomers && (
                            <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
                                Failed to load customers.
                            </div>
                        )}

                        {!loadingCustomers &&
                            !customersError &&
                            (!customers || customers.length === 0) && (
                                <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-3 py-3 text-sm text-gray-600">
                                    You have no customers yet. Invite one using the form above.
                                </div>
                            )}

                        {customers && customers.length > 0 && (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {customers.map((c: MyCustomer) => (
                                    <CustomerCard
                                        key={c.user?._id || c.profile?._id}
                                        customer={c}
                                        reloadCustomers={reloadCustomers}
                                        reloadInvites={reloadInvites}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </ProtectedLayout>
    );
}