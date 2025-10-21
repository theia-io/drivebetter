// app/my-rides/page.tsx
"use client";

import Link from "next/link";
import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import { Loader2, MapPin, Calendar, Clock, ArrowRight, RefreshCcw } from "lucide-react";
import { useMyRides } from "@/stores/rides";
import type { Ride } from "@/types";
import {fmtDate, fmtTime} from "@/services/convertors";

export default function MyRidesPage() {
    const { data, isLoading, mutate } = useMyRides();

    const items: Ride[] = data?.items ?? [];
    const total = data?.total ?? 0;

    return (
        <ProtectedLayout>
            <Container className="px-3 sm:px-6 lg:px-8">
                <div className="space-y-4 sm:space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <Typography className="text-base sm:text-2xl font-bold text-gray-900">
                                My Rides
                            </Typography>
                            <div className="text-xs text-gray-600">
                                {isLoading ? "Loading…" : `Total assigned to you: ${total}`}
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

                    {/* List */}
                    <Card variant="elevated">
                        <CardBody className="p-4 sm:p-6 space-y-3">
                            {isLoading ? (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Loading…
                                </div>
                            ) : items.length === 0 ? (
                                <div className="text-sm text-gray-600">No rides assigned to you yet.</div>
                            ) : (
                                <div className="space-y-3">
                                    {items.map((r) => {
                                        const dt = r.datetime ? new Date(r.datetime) : null;
                                        return (
                                            <div
                                                key={r._id}
                                                className="rounded-lg border p-3 bg-white flex items-start justify-between gap-3"
                                            >
                                                <div className="min-w-0 space-y-1">
                                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                                        <MapPin className="w-4 h-4 text-gray-400" />
                                                        <span className="truncate">
                              <span className="font-medium">From:</span> {r.from}
                            </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                                        <MapPin className="w-4 h-4 text-gray-400" />
                                                        <span className="truncate">
                              <span className="font-medium">To:</span> {r.to}
                            </span>
                                                    </div>
                                                    {dt && (
                                                        <div className="flex items-center gap-3 text-sm text-gray-700">
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                  {fmtDate(r.datetime)}
                              </span>
                                                            <span className="inline-flex items-center gap-1">
                                <Clock className="w-4 h-4 text-gray-400" />
                                                                {fmtTime(r.datetime)}
                              </span>
                                                            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs capitalize">
                                {r.status?.replace(/_/g, " ") || "—"}
                              </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="shrink-0">
                                                    <Link href={`/rides/${r._id}`}>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            rightIcon={<ArrowRight className="w-4 h-4" />}
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

                            {/* Pagination hint (this page uses the first page returned by useMyRides) */}
                            {!!data && data.pages > 1 && (
                                <div className="pt-3 text-xs text-gray-600">
                                    Showing page {data.page} of {data.pages}. (This view uses the default page from
                                    <code className="mx-1">useMyRides()</code>.)
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>
            </Container>
        </ProtectedLayout>
    );
}
