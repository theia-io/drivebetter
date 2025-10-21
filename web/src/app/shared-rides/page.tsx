// app/shared-rides/page.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import { Info, MapPin, Clock, Share2, Check, Loader2, ArrowRight } from "lucide-react";
import { useDriverInbox, useQueueRideClaim } from "@/stores/rideClaims";

export default function DriverSharedRidesPage() {
    const [tab, setTab] = useState<"available" | "claimed">("available");

    const {
        data: available = [],
        isLoading: loadingAvailable,
        mutate: mutateAvailable,
    } = useDriverInbox("available");

    const {
        data: claimed = [],
        isLoading: loadingClaimed,
        mutate: mutateClaimed,
    } = useDriverInbox("claimed");

    const items = tab === "available" ? available : claimed;
    const isLoading = tab === "available" ? loadingAvailable : loadingClaimed;

    const { queue, isQueuing } = useQueueRideClaim();
    const [justQueued, setJustQueued] = useState<Record<string, true>>({});

    async function requestRide(shareId: string) {
        try {
            await queue(shareId);
            setJustQueued((m) => ({ ...m, [shareId]: true }));
            await Promise.all([mutateAvailable(), mutateClaimed()]);
        } catch (e) {
            alert((e as Error).message);
        }
    }

    return (
        <ProtectedLayout>
            <Container className="px-3 sm:px-6 lg:px-8">
                <div className="space-y-4 sm:space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Share2 className="w-5 h-5 text-indigo-600" />
                            <Typography className="text-base sm:text-2xl font-bold text-gray-900">
                                New Rides
                            </Typography>
                        </div>
                    </div>

                    {/* How it works */}
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900 flex gap-2">
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                            Rides listed here were shared with you (publicly, via your group, or directly).
                            Click <span className="font-semibold">Request ride</span> to enter the queue.
                            A dispatcher will review all requests and{" "}
                            <span className="font-semibold">approve one driver</span>. Until approved,
                            the ride will not be assigned to you.
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center justify-between">
                        <div className="flex gap-1 text-xs">
                            {(["available", "claimed"] as const).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setTab(t)}
                                    className={`px-2 py-1 rounded border ${
                                        tab === t
                                            ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                                            : "bg-white border-gray-200 text-gray-700"
                                    }`}
                                >
                                    {t === "available" ? "Available" : "My Assigned"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* List */}
                    <Card variant="elevated">
                        <CardBody className="p-4 sm:p-6 space-y-3">
                            {isLoading ? (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Loading…
                                </div>
                            ) : items.length === 0 ? (
                                <div className="text-sm text-gray-600">
                                    {tab === "available" ? "No new rides at the moment." : "No assigned rides yet."}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {items.map((it) => {
                                        const dt = new Date(it.ride.datetime);
                                        const queued = !!(it.shareId && justQueued[it.shareId]);
                                        const canRequest = tab === "available" && !!it.shareId;

                                        return (
                                            <div key={`${it.ride._id}-${it.shareId ?? "none"}`} className="rounded-lg border p-3 bg-white">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                                            <MapPin className="w-4 h-4 text-gray-400" />
                                                            <span className="truncate">
                                <span className="font-medium">From:</span> {it.ride.from}
                              </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                                            <MapPin className="w-4 h-4 text-gray-400" />
                                                            <span className="truncate">
                                <span className="font-medium">To:</span> {it.ride.to}
                              </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                                            <Clock className="w-4 h-4 text-gray-400" />
                                                            <span title={dt.toISOString()}>
                                {dt.toLocaleDateString()} • {dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                                                        </div>

                                                        {/* tiny meta */}
                                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
                                                            {it.visibility && (
                                                                <span className="inline-flex items-center rounded-full border px-2 py-0.5 capitalize">
                                  {it.visibility}
                                </span>
                                                            )}
                                                            {typeof it.maxClaims === "number" && <span>max claims: {it.maxClaims}</span>}
                                                            {it.expiresAt && <span>expires: {new Date(it.expiresAt).toLocaleString()}</span>}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                                        <Link href={`/rides/${it.ride._id}`}>
                                                            <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                                                                Details
                                                            </Button>
                                                        </Link>

                                                        {canRequest ? (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => requestRide(it.shareId!)}
                                                                disabled={isQueuing || queued}
                                                                leftIcon={
                                                                    queued ? (
                                                                        <Check className="w-4 h-4" />
                                                                    ) : isQueuing ? (
                                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                                    ) : undefined
                                                                }
                                                            >
                                                                {queued ? "Requested" : "Request ride"}
                                                            </Button>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>
            </Container>
        </ProtectedLayout>
    );
}
