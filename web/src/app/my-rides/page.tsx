// app/my-rides/page.tsx
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import { Loader2, MapPin, Calendar, Clock, ArrowRight, RefreshCcw } from "lucide-react";
import { useMyRides } from "@/stores/rides";
import type { Ride } from "@/types";
import { fmtDate, fmtTime } from "@/services/convertors";

type TabKey = "active" | "completed";

export default function MyRidesPage() {
    const { data, isLoading, mutate } = useMyRides();

    const items: Ride[] = data?.items ?? [];
    const total = data?.total ?? 0;

    const activeRides = useMemo(() => items.filter((r) => r.status !== "completed"), [items]);
    const completedRides = useMemo(() => items.filter((r) => r.status === "completed"), [items]);

    const [activeTab, setActiveTab] = useState<TabKey>("active");

    const currentList = activeTab === "active" ? activeRides : completedRides;

    return (
        <ProtectedLayout>
            <Container className="px-3 sm:px-6 lg:px-8">
                <div className="space-y-4 sm:space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <Typography className="text-base sm:text-2xl font-bold text-gray-900">
                                My Assignment
                            </Typography>
                            <div className="text-xs text-gray-600 space-y-0.5">
                                <div>
                                    {isLoading
                                        ? "Loading…"
                                        : `Total rides assigned to you: ${total}`}
                                </div>
                                {!isLoading && (
                                    <div className="text-[11px] text-gray-500">
                                        Active: {activeRides.length} · Completed:{" "}
                                        {completedRides.length}
                                    </div>
                                )}
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => mutate()}
                            leftIcon={<RefreshCcw className="w-4 h-4" />}
                        >
                            Refresh
                        </Button>
                    </div>

                    {/* Tabs + List */}
                    <Card variant="elevated">
                        <CardBody className="p-3 sm:p-6 space-y-3">
                            {/* Tabs */}
                            <div className="flex justify-between items-center gap-2">
                                <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs sm:text-sm">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("active")}
                                        className={`px-3 py-1.5 rounded-md font-medium ${
                                            activeTab === "active"
                                                ? "bg-white text-gray-900 shadow-sm"
                                                : "text-gray-600 hover:bg-white/70"
                                        }`}
                                    >
                                        Active ({activeRides.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("completed")}
                                        className={`px-3 py-1.5 rounded-md font-medium ${
                                            activeTab === "completed"
                                                ? "bg-white text-gray-900 shadow-sm"
                                                : "text-gray-600 hover:bg-white/70"
                                        }`}
                                    >
                                        Previous ({completedRides.length})
                                    </button>
                                </div>
                            </div>

                            {/* List */}
                            {isLoading ? (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Loading…
                                </div>
                            ) : currentList.length === 0 ? (
                                <div className="text-sm text-gray-600">
                                    {activeTab === "active"
                                        ? "You have no active rides assigned to you."
                                        : "You have no completed rides assigned to you yet."}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {currentList.map((r) => {
                                        const dt = r.datetime ? new Date(r.datetime) : null;
                                        return (
                                            <div
                                                key={r._id}
                                                className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4 flex items-start justify-between gap-3"
                                            >
                                                <div className="min-w-0 space-y-1">
                                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                                        <MapPin className="w-4 h-4 text-gray-400" />
                                                        <span className="truncate">
                                                            <span className="font-medium">
                                                                From:
                                                            </span>{" "}
                                                            {r.from}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                                        <MapPin className="w-4 h-4 text-gray-400" />
                                                        <span className="truncate">
                                                            <span className="font-medium">To:</span>{" "}
                                                            {r.to}
                                                        </span>
                                                    </div>
                                                    {dt && (
                                                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
                                                            <span className="inline-flex items-center gap-1">
                                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                                {fmtDate(r.datetime)}
                                                            </span>
                                                            <span className="inline-flex items-center gap-1">
                                                                <Clock className="w-4 h-4 text-gray-400" />
                                                                {fmtTime(r.datetime)}
                                                            </span>
                                                            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs capitalize">
                                                                {r.status?.replace(/_/g, " ") ||
                                                                    "—"}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="shrink-0">
                                                    <Link href={`/rides/${r._id}`}>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            rightIcon={
                                                                <ArrowRight className="w-4 h-4" />
                                                            }
                                                        >
                                                            Details
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {!!data && data.pages > 1 && (
                                <div className="pt-3 text-xs text-gray-600">
                                    Showing page {data.page} of {data.pages}. (This view uses the
                                    default page from
                                    <code className="mx-1">useMyRides()</code>
                                    .)
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>
            </Container>
        </ProtectedLayout>
    );
}
