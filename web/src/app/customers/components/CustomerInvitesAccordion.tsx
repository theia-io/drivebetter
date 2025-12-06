// components/customers/CustomerInvitesAccordion.tsx
"use client";

import { useState, useMemo } from "react";
import { Mail, Clock, Info, Loader2 } from "lucide-react";
import {
    useMyCustomerInvites,
    type MyCustomerInvite,
} from "@/stores/customers";

type Props = {
    userName?: string;
};

function formatDate(iso?: string | null) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString();
}

export default function CustomerInvitesAccordion({ userName }: Props) {
    const {
        data: invites,
        isLoading,
        error,
        mutate: reloadInvites,
    } = useMyCustomerInvites();

    const [open, setOpen] = useState(true);

    const { pendingInvites, usedInvites, expiredInvites } = useMemo(() => {
        const list = invites ?? [];
        return {
            pendingInvites: list.filter((i) => i.status === "pending"),
            usedInvites: list.filter((i) => i.status === "used"),
            expiredInvites: list.filter((i) => i.status === "expired"),
        };
    }, [invites]);

    const totalInvites = invites?.length ?? 0;

    return (
        <section className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            {/* Accordion header */}
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between px-3 py-2.5 sm:px-4">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50">
                        <Mail className="h-4 w-4 text-sky-600" />
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-semibold text-gray-900">
                            Your invitations
                        </p>
                        <p className="text-xs text-gray-500">
                            Invites sent by{" "}
                            <span className="font-medium">
                                {userName || "you"}
                            </span>
                            .
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {totalInvites > 0 && (
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600">
                            {totalInvites} total
                        </span>
                    )}
                    <span className="text-[11px] font-medium text-gray-500">
                        {open ? "Hide" : "Show"}
                    </span>
                </div>
            </button>

            {/* Accordion body */}
            {open && (
                <div>
                    {/* Loading / error / empty states */}
                    {isLoading && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                            <span>Loading invitations…</span>
                        </div>
                    )}

                    {error && !isLoading && (
                        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            <Info className="h-4 w-4" />
                            <span>Failed to load invitations.</span>
                            <button
                                type="button"
                                onClick={() => reloadInvites()}
                                className="ml-auto text-xs font-medium underline"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {!isLoading &&
                        !error &&
                        (!invites || invites.length === 0) && (
                            <div className="text-sm text-gray-600">
                                No invitations yet. New invites will appear here.
                            </div>
                        )}

                    {!isLoading && !error && invites && invites.length > 0 && (
                        <div className="space-y-3">
                            {/* Pending block */}
                            {pendingInvites.length > 0 && (
                                <div className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-3">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-sky-900">
                                        <Info className="h-3.5 w-3.5" />
                                        <span>Pending</span>
                                    </div>
                                    <ul className="mt-2 space-y-1.5 text-xs text-gray-800">
                                        {pendingInvites.map((i: MyCustomerInvite) => (
                                            <li
                                                key={i._id}
                                                className="flex flex-wrap items-center justify-between gap-1"
                                            >
                                                <div className="flex flex-col">
                                                    <span className="font-medium">
                                                        {i.email}
                                                    </span>
                                                    <span className="text-[11px] text-gray-500">
                                                        Code: {i.code}
                                                    </span>
                                                </div>
                                                <div className="text-right text-[11px] text-gray-600">
                                                    <div>
                                                        Created: {formatDate(i.createdAt)}
                                                    </div>
                                                    <div>
                                                        Expires: {formatDate(i.expiresAt)}
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Used / expired block */}
                            {(usedInvites.length > 0 ||
                                expiredInvites.length > 0) && (
                                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-900">
                                        <Clock className="h-3.5 w-3.5 text-gray-500" />
                                        <span>Invite history</span>
                                    </div>
                                    <ul className="mt-2 space-y-1.5 text-xs text-gray-800">
                                        {[...usedInvites, ...expiredInvites].map(
                                            (i: MyCustomerInvite) => (
                                                <li
                                                    key={i._id}
                                                    className="flex flex-wrap items-center justify-between gap-1 border-b-2"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">
                                                            {i.email}
                                                        </span>
                                                        <span className="text-[11px] text-gray-500">
                                                            Code: {i.code}
                                                        </span>
                                                    </div>
                                                    <div className="text-right text-[11px] text-gray-600">
                                                        <div>
                                                            Status:{" "}
                                                            <span className="font-medium">
                                                                {i.status}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            Created:{" "}
                                                            {formatDate(i.createdAt)}
                                                        </div>
                                                        {i.usedAt && (
                                                            <div>
                                                                Used:{" "}
                                                                {formatDate(i.usedAt)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
