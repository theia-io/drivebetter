// app/customers/page.tsx
"use client";

import { useState } from "react";
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
} from "lucide-react";

import ProtectedLayout from "@/components/ProtectedLayout";
import { useAuthStore } from "@/stores/auth";
import {
    createCustomerInvite,
    useMyCustomers,
    type MyCustomer,
} from "@/stores/customers";

type InviteFormState = {
    email: string;
    message: string;
    expiresAt: string;
};

export default function CustomersPage() {
    const { user } = useAuthStore();

    const {
        data: customers,
        isLoading: loadingCustomers,
        error: customersError,
        mutate: reloadCustomers,
    } = useMyCustomers();

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
            await reloadCustomers();
        } catch (err: any) {
            setInviteError(err?.message || "Failed to create invite.");
        } finally {
            setInviting(false);
        }
    }

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
                            <button
                                type="button"
                                onClick={() => setInviteOpen(true)}
                                className="inline-flex items-center justify-center rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs font-medium text-sky-800 shadow-sm hover:bg-sky-50 sm:text-sm"
                            >
                                <UserPlus className="mr-1.5 h-4 w-4" />
                                Invite customer
                            </button>
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
                                    <button
                                        type="submit"
                                        disabled={inviting}
                                        className="inline-flex w-full items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                                    >
                                        {inviting && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )}
                                        Send invite
                                    </button>
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
                                {customers.map((c: MyCustomer) => {
                                    const u: any = c.user;
                                    const p = c.profile;
                                    const s = c.stats;
                                    const registeredAt = u?.createdAt
                                        ? new Date(u.createdAt)
                                        : null;
                                    const lastRideAt = s?.lastRideAt
                                        ? new Date(s.lastRideAt)
                                        : null;

                                    return (
                                        <article
                                            key={u?._id}
                                            className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md sm:p-4"
                                        >
                                            {/* Header */}
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 space-y-0.5">
                                                    <h2 className="truncate text-sm font-semibold text-gray-900">
                                                        {u?.name || "Unregistered customer"}
                                                    </h2>
                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-600">
                                                        {u?.email && (
                                                            <span className="inline-flex items-center gap-1">
                                                                <Mail className="h-3.5 w-3.5 text-gray-400" />
                                                                <span className="truncate">
                                                                    {u.email}
                                                                </span>
                                                            </span>
                                                        )}
                                                        {u?.phone && (
                                                            <span className="inline-flex items-center gap-1">
                                                                <Phone className="h-3.5 w-3.5 text-gray-400" />
                                                                <span className="truncate">
                                                                    {u.phone}
                                                                </span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <span
                                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                                        u
                                                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                                            : "bg-amber-50 text-amber-800 border border-amber-200"
                                                    }`}
                                                >
                                                    {u ? "Registered" : "Invited"}
                                                </span>
                                            </div>

                                            {/* Stats */}
                                            <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-gray-600">
                                                <div className="space-y-0.5">
                                                    <dt className="uppercase tracking-wide text-gray-500">
                                                        Age
                                                    </dt>
                                                    <dd className="text-sm font-medium text-gray-900">
                                                        {typeof p?.age === "number"
                                                            ? p.age
                                                            : "—"}
                                                    </dd>
                                                </div>
                                                <div className="space-y-0.5">
                                                    <dt className="uppercase tracking-wide text-gray-500">
                                                        Rides
                                                    </dt>
                                                    <dd className="flex items-center gap-1 text-sm font-medium text-gray-900">
                                                        <Car className="h-3.5 w-3.5 text-gray-400" />
                                                        {typeof s?.ridesTotal === "number"
                                                            ? s.ridesTotal
                                                            : "—"}
                                                    </dd>
                                                </div>
                                                <div className="space-y-0.5">
                                                    <dt className="uppercase tracking-wide text-gray-500">
                                                        Registered
                                                    </dt>
                                                    <dd className="flex items-center gap-1">
                                                        <CalendarClock className="h-3.5 w-3.5 text-gray-400" />
                                                        <span className="text-[11px]">
                                                            {registeredAt
                                                                ? registeredAt.toLocaleDateString()
                                                                : "—"}
                                                        </span>
                                                    </dd>
                                                </div>
                                                <div className="space-y-0.5">
                                                    <dt className="uppercase tracking-wide text-gray-500">
                                                        Last ride
                                                    </dt>
                                                    <dd className="flex items-center gap-1">
                                                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                                                        <span className="text-[11px]">
                                                            {lastRideAt
                                                                ? lastRideAt.toLocaleDateString()
                                                                : "—"}
                                                        </span>
                                                    </dd>
                                                </div>
                                            </dl>

                                            {/* Actions */}
                                            <div className="mt-4 flex flex-col gap-2 text-xs sm:text-sm">
                                                <div className="flex flex-col gap-2 sm:flex-row">
                                                    <Link
                                                        href={`/rides/new?customerId=${encodeURIComponent(
                                                            u?._id || "",
                                                        )}`}
                                                        className="sm:flex-1"
                                                    >
                                                        <button
                                                            type="button"
                                                            className="inline-flex w-full items-center justify-center rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-700"
                                                            disabled={!u}
                                                        >
                                                            <Car className="mr-1.5 h-4 w-4" />
                                                            Create ride
                                                        </button>
                                                    </Link>
                                                    <Link
                                                        href={`/rides?customerId=${encodeURIComponent(
                                                            u?._id || "",
                                                        )}`}
                                                        className="sm:flex-1"
                                                    >
                                                        <button
                                                            type="button"
                                                            className="inline-flex w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                                        >
                                                            Ride history
                                                        </button>
                                                    </Link>
                                                </div>
                                                <div className="flex flex-col gap-2 sm:flex-row">
                                                    <Link
                                                        href={`/customers/${encodeURIComponent(
                                                            u?._id || "",
                                                        )}`}
                                                        className="sm:flex-1"
                                                    >
                                                        <button
                                                            type="button"
                                                            className="inline-flex w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                                        >
                                                            View details
                                                        </button>
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        onClick={() => reloadCustomers()}
                                                        className="inline-flex w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 sm:flex-none sm:w-auto"
                                                    >
                                                        Refresh
                                                    </button>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </ProtectedLayout>
    );
}
