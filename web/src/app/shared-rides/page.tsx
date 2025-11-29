"use client";

import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import { useDriverInbox } from "@/stores/rideClaims";
import { Info, Loader2, Share2 } from "lucide-react";
import { useState } from "react";
import SharedRideRequestCard from "@/components/ui/ride/SharedRideRequestCard";

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

    async function refreshAfterRequest() {
        await Promise.all([mutateAvailable(), mutateClaimed()]);
    }

    return (
        <ProtectedLayout>
            <Container className="px-3 sm:px-6 lg:px-8">
                <div className="space-y-4 sm:space-y-6 py-4 sm:py-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Share2 className="w-5 h-5 text-indigo-600" />
                            <Typography className="text-base sm:text-2xl font-bold text-gray-900">
                                New Rides
                            </Typography>
                        </div>
                    </div>

                    {/* How it works */}
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-xs sm:text-sm text-indigo-900 flex gap-2">
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p>
                                Rides listed here were shared with you (publicly, via your group,
                                or directly). Tap{" "}
                                <span className="font-semibold">Request ride</span> to enter the
                                queue.
                            </p>
                            <p>
                                A dispatcher reviews all requests and{" "}
                                <span className="font-semibold">approves one driver</span>.
                                Until approved, the ride is not assigned to you. Use{" "}
                                <span className="font-semibold">My Assigned</span> to see rides
                                that were approved and assigned to you.
                            </p>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center justify-between">
                        <div className="inline-flex rounded-md border border-gray-200 bg-white p-0.5 text-xs">
                            {(["available", "claimed"] as const).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setTab(t)}
                                    className={`px-3 py-1 rounded text-xs font-medium ${
                                        tab === t
                                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                            : "text-gray-700"
                                    }`}
                                >
                                    {t === "available"
                                        ? "Available"
                                        : "My Assigned"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* List */}
                    <Card variant="elevated">
                        <CardBody className="p-3 sm:p-4 space-y-3">
                            {isLoading ? (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Loading…
                                </div>
                            ) : items.length === 0 ? (
                                <div className="text-sm text-gray-600">
                                    {tab === "available"
                                        ? "No new rides at the moment."
                                        : "No assigned rides yet."}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {items.map((it: any) => (
                                        <SharedRideRequestCard
                                            key={`${it.ride._id}-${it.shareId ?? "none"}`}
                                            item={it}
                                            context={tab}
                                            onAfterRequest={refreshAfterRequest}
                                        />
                                    ))}
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>
            </Container>
        </ProtectedLayout>
    );
}
