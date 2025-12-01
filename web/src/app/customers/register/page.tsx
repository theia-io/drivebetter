// app/customers/register/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Mail,
    User,
    Lock,
    Phone,
    Calendar,
    Loader2,
    AlertCircle,
    CheckCircle2,
    KeyRound,
    Eye,
    EyeOff,
} from "lucide-react";

import { useCustomerInvite, registerCustomer } from "@/stores/customers";
import { useAuthStore } from "@/stores/auth";
import {Button} from "@/components/ui";

type FormState = {
    email: string;
    code: string;
    name: string;
    password: string;
    passwordConfirm: string;
    phone: string;
    age: string;
};

export default function CustomerRegisterPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const codeFromQuery = searchParams.get("code") || "";
    const emailFromQuery = searchParams.get("email") || "";

    const [form, setForm] = useState<FormState>({
        email: emailFromQuery,
        code: codeFromQuery,
        name: "",
        password: "",
        passwordConfirm: "",
        phone: "",
        age: "",
    });

    const { data: invite, isLoading, error } = useCustomerInvite(
        form.code.trim() ? form.code.trim() : undefined,
    );

    const { login } = useAuthStore();

    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

    useEffect(() => {
        setSubmitError(null);
        setSubmitSuccess(null);
    }, [form.code]);

    useEffect(() => {
        if (invite?.email && !form.email) {
            setForm((f) => ({ ...f, email: invite.email }));
        }
    }, [invite, form.email]);

    const status = invite?.status;

    const hasCode = !!form.code.trim();
    const inviteInvalid =
        hasCode &&
        (!invite ||
            !!error ||
            status === "expired" ||
            status === "used");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitError(null);
        setSubmitSuccess(null);

        const code = form.code.trim();
        const email = form.email.trim().toLowerCase();

        if (!code) {
            setSubmitError("Invitation code is required.");
            return;
        }
        if (!email) {
            setSubmitError("Email is required.");
            return;
        }
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

        if (invite && email !== invite.email.toLowerCase()) {
            setSubmitError(
                "Email does not match the address this invitation was sent to.",
            );
            return;
        }

        if (inviteInvalid) {
            setSubmitError(
                "This invitation is not valid. Ask your dispatcher/driver/admin to send a new one.",
            );
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

            // Auto-login customer and send to account page
            const loginEmail = invite?.email ?? email;
            const loginSuccess = await login(loginEmail, form.password);

            if (loginSuccess) {
                router.push("/customers/account");
                return;
            }

            setSubmitSuccess(
                "Account created, but automatic sign-in failed. Please log in manually.",
            );
        } catch (err: any) {
            setSubmitError(err?.message || "Failed to complete registration.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-6 sm:px-6 sm:py-10">
                <header className="mb-4 sm:mb-6">
                    <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
                        Customer registration
                    </h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Enter the email and invitation code you received, then create your
                        account.
                    </p>
                </header>

                <main className="flex-1">
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                        {!hasCode && (
                            <div className="mb-4 rounded-xl bg-gray-50 p-3 text-xs text-gray-700">
                                <p className="font-medium">Where to find your invite details</p>
                                <p className="mt-0.5">
                                    Check the email from your dispatcher/driver/admin. Copy the{" "}
                                    <span className="font-mono text-gray-900">
                                        invitation code
                                    </span>{" "}
                                    and the email address it was sent to.
                                </p>
                            </div>
                        )}

                        {isLoading && hasCode && (
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

                        {inviteInvalid && hasCode && !isLoading && (
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

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Email */}
                            <div className="space-y-1">
                                <label className="block text-xs font-medium text-gray-700">
                                    Email used for the invite
                                </label>
                                <div className="relative">
                                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                        <Mail className="h-4 w-4" />
                                    </span>
                                    <input
                                        type="email"
                                        autoComplete="email"
                                        value={form.email}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                email: e.target.value,
                                            }))
                                        }
                                        className="block w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-sky-500 focus:ring-sky-500"
                                        placeholder="customer@example.com"
                                    />
                                </div>
                            </div>

                            {/* Code */}
                            <div className="space-y-1">
                                <label className="block text-xs font-medium text-gray-700">
                                    Invitation code
                                </label>
                                <div className="relative">
                                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                        <KeyRound className="h-4 w-4" />
                                    </span>
                                    <input
                                        type="text"
                                        value={form.code}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                code: e.target.value.trim(),
                                            }))
                                        }
                                        className="block w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-sky-500 focus:ring-sky-500"
                                        placeholder="Paste your code from the email"
                                    />
                                </div>
                            </div>

                            {/* Name */}
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

                            {/* Phone */}
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

                            {/* Age */}
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

                            {/* Password */}
                            <div className="space-y-1">
                                <label className="block text-xs font-medium text-gray-700">
                                    Password
                                </label>
                                <div className="relative">
                                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                        <Lock className="h-4 w-4" />
                                    </span>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="new-password"
                                        required
                                        value={form.password}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                password: e.target.value,
                                            }))
                                        }
                                        className="block w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-9 pr-10 text-sm text-gray-900 focus:border-sky-500 focus:ring-sky-500"
                                        placeholder="Choose a password"
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                        onClick={() => setShowPassword((v) => !v)}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                        ) : (
                                            <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm password */}
                            <div className="space-y-1">
                                <label className="block text-xs font-medium text-gray-700">
                                    Confirm password
                                </label>
                                <div className="relative">
                                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                        <Lock className="h-4 w-4" />
                                    </span>
                                    <input
                                        type={showPasswordConfirm ? "text" : "password"}
                                        autoComplete="new-password"
                                        required
                                        value={form.passwordConfirm}
                                        onChange={(e) =>
                                            setForm((f) => ({
                                                ...f,
                                                passwordConfirm: e.target.value,
                                            }))
                                        }
                                        className="block w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-9 pr-10 text-sm text-gray-900 focus:border-sky-500 focus:ring-sky-500"
                                        placeholder="Repeat password"
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                        onClick={() => setShowPasswordConfirm((v) => !v)}
                                    >
                                        {showPasswordConfirm ? (
                                            <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                        ) : (
                                            <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                        )}
                                    </button>
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

                            <Button
                                type="submit"
                                disabled={submitting}
                                colorScheme="primary"
                                className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {submitting && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Create account
                            </Button>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
}
