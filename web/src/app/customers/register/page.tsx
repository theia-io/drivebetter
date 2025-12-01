// app/customers/register/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, User, Lock, Phone, Calendar, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

import { useCustomerInvite, registerCustomer } from "@/stores/customers";

type FormState = {
    name: string;
    password: string;
    passwordConfirm: string;
    phone: string;
    age: string;
};

export default function CustomerRegisterPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const code = searchParams.get("code") || "";

    const { data: invite, isLoading, error } = useCustomerInvite(code || undefined);

    const [form, setForm] = useState<FormState>({
        name: "",
        password: "",
        passwordConfirm: "",
        phone: "",
        age: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

    useEffect(() => {
        setSubmitError(null);
        setSubmitSuccess(null);
    }, [code]);

    const status = invite?.status;

    const inviteInvalid =
        !code ||
        !!error ||
        (!isLoading && (!invite || status === "expired" || status === "used"));

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!code) return;

        setSubmitError(null);
        setSubmitSuccess(null);

        if (!form.name.trim()) {
            setSubmitError("Name is required.");
            return;
        }
        if (!form.password || form.password.length < 6) {
            setSubmitError("Password must be at least 6 characters.");
            return;
        }
        if (form.password !== form.passwordConfirm) {
            setSubmitError("Passwords do not match.");
            return;
        }

        const ageNum =
            form.age.trim() === "" ? undefined : Number.parseInt(form.age.trim(), 10);
        if (ageNum != null && Number.isNaN(ageNum)) {
            setSubmitError("Age must be a number.");
            return;
        }

        setSubmitting(true);
        try {
            await registerCustomer({
                code,
                name: form.name.trim(),
                password: form.password,
                phone: form.phone.trim() || undefined,
                age: ageNum,
            });

            setSubmitSuccess("Account created. You can now sign in.");
            // optional redirect, adjust route to your login page if you want:
            // router.push("/auth/login");
        } catch (err: any) {
            setSubmitError(err?.message || "Failed to complete registration.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-6 sm:px-6 sm:py-10">
                {/* Header */}
                <header className="mb-4 sm:mb-6">
                    <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
                        Complete your registration
                    </h1>
                    <p className="mt-1 text-sm text-gray-600">
                        You were invited to use this service. Create your account to start
                        requesting rides.
                    </p>
                </header>

                {/* Card */}
                <main className="flex-1">
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                        {/* Invite state */}
                        {!code && (
                            <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                <p>
                                    Invitation code is missing. Use the link from your email, or
                                    make sure the <span className="font-mono">?code=…</span> query
                                    parameter is present.
                                </p>
                            </div>
                        )}

                        {isLoading && code && (
                            <div className="mb-4 flex items-center gap-2 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                <span>Checking your invitation…</span>
                            </div>
                        )}

                        {invite && (
                            <div className="mb-4 rounded-xl border border-sky-100 bg-sky-50 p-3 text-xs sm:text-sm">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                                            Invitation details
                                        </p>
                                        <div className="mt-1 space-y-0.5 text-gray-700">
                                            <p>
                                                Email:{" "}
                                                <span className="font-medium">
                                                    {invite.email}
                                                </span>
                                            </p>
                                            {invite.invitedBy && (
                                                <p>
                                                    Invited by:{" "}
                                                    <span className="font-medium">
                                                        {invite.invitedBy.name ||
                                                            invite.invitedBy.email ||
                                                            invite.invitedBy._id}
                                                    </span>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <span
                                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                            status === "pending"
                                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                                : status === "used"
                                                    ? "bg-gray-100 text-gray-700 border border-gray-200"
                                                    : "bg-amber-100 text-amber-800 border border-amber-200"
                                        }`}
                                    >
                                        {status === "pending"
                                            ? "Pending"
                                            : status === "used"
                                                ? "Already used"
                                                : "Expired"}
                                    </span>
                                </div>
                            </div>
                        )}

                        {inviteInvalid && code && !isLoading && (
                            <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-800">
                                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold">
                                        This invitation is not valid anymore.
                                    </p>
                                    <p className="mt-0.5">
                                        It may have been used already or has expired. Ask the
                                        dispatcher/driver/admin who invited you to send a new
                                        invitation.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Registration form */}
                        {!inviteInvalid && code && status === "pending" && (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-gray-700">
                                        Full name
                                    </label>
                                    <div className="relative">
                                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                            <User className="h-4 w-4" />
                                        </span>
                                        <input
                                            type="text"
                                            autoComplete="name"
                                            required
                                            value={form.name}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    name: e.target.value,
                                                }))
                                            }
                                            className="block w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-sky-500 focus:ring-sky-500"
                                            placeholder="Your name"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-gray-700">
                                        Phone number (optional)
                                    </label>
                                    <div className="relative">
                                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                            <Phone className="h-4 w-4" />
                                        </span>
                                        <input
                                            type="tel"
                                            autoComplete="tel"
                                            value={form.phone}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    phone: e.target.value,
                                                }))
                                            }
                                            className="block w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-sky-500 focus:ring-sky-500"
                                            placeholder="+1 555 123 4567"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-gray-700">
                                        Age (optional)
                                    </label>
                                    <div className="relative">
                                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                            <Calendar className="h-4 w-4" />
                                        </span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={120}
                                            value={form.age}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    age: e.target.value,
                                                }))
                                            }
                                            className="block w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-sky-500 focus:ring-sky-500"
                                            placeholder="Your age"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-gray-700">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                            <Lock className="h-4 w-4" />
                                        </span>
                                        <input
                                            type="password"
                                            autoComplete="new-password"
                                            required
                                            value={form.password}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    password: e.target.value,
                                                }))
                                            }
                                            className="block w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-sky-500 focus:ring-sky-500"
                                            placeholder="Choose a password"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-gray-700">
                                        Confirm password
                                    </label>
                                    <div className="relative">
                                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                            <Lock className="h-4 w-4" />
                                        </span>
                                        <input
                                            type="password"
                                            autoComplete="new-password"
                                            required
                                            value={form.passwordConfirm}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    passwordConfirm: e.target.value,
                                                }))
                                            }
                                            className="block w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-sky-500 focus:ring-sky-500"
                                            placeholder="Repeat password"
                                        />
                                    </div>
                                </div>

                                {submitError && (
                                    <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-800">
                                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                        <p>{submitError}</p>
                                    </div>
                                )}

                                {submitSuccess && (
                                    <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                        <div>
                                            <p className="font-semibold">
                                                Registration completed.
                                            </p>
                                            <p className="mt-0.5">{submitSuccess}</p>
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {submitting && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Create account
                                </button>
                            </form>
                        )}

                        {!code && (
                            <p className="mt-4 text-xs text-gray-500">
                                If you opened this page manually, go back to your email and use
                                the invitation link provided there.
                            </p>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
