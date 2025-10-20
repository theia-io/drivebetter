// app/driver/shared/page.tsx
"use client";

import { useState } from "react";
import useSWRMutation from "swr/mutation";
import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import { useDriverInbox, claimRideShare, type InboxItem } from "@/stores/rideShares";
import { mutate as globalMutate } from "swr/_internal";

export default function DriverSharedPage() {
    const [tab, setTab] = useState<"available" | "claimed">("available");
    const { data = [], isLoading } = useDriverInbox(tab);

    const claimMut = useSWRMutation(
        "/ride-shares/claim",
        async (_key, { arg }: { arg: { shareId: string } }) => {
            return claimRideShare(arg.shareId);
        },
        {
            onSuccess: async () => {
                await Promise.all([
                    globalMutate("/ride-shares/inbox?tab=available"),
                    globalMutate("/ride-shares/inbox?tab=claimed"),
                ]);
                setTab("claimed");
            },
        }
    );

    return (
        <ProtectedLayout>
            <Container className="px-3 sm:px-6 lg:px-8">
                <div className="flex items-center gap-2 mb-4">
                    <Typography className="text-xl font-bold">Shared Rides</Typography>
                    <div className="ml-auto flex gap-1 text-xs">
                        {(["available", "claimed"] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`px-2 py-1 rounded border ${
                                    tab === t
                                        ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                                        : "bg-white border-gray-200 text-gray-700"
                                }`}
                            >
                                {t === "available" ? "Available" : "Claimed"}
                            </button>
                        ))}
                    </div>
                </div>

                <Card variant="elevated">
                    <CardBody className="p-4 sm:p-6 space-y-3">
                        {isLoading ? (
                            <div className="text-sm text-gray-600">Loading…</div>
                        ) : data.length === 0 ? (
                            <div className="text-sm text-gray-600">
                                {tab === "available" ? "No available shared rides." : "No claimed shared rides yet."}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {data.map((item: InboxItem) => (
                                    <div key={`${item.ride._id}-${item.shareId ?? "none"}`} className="rounded-lg border p-3 bg-white">
                                        <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {item.ride.from} → {item.ride.to}
                      </span>
                                            <span className="text-xs text-gray-600">{new Date(item.ride.datetime).toLocaleString()}</span>
                                            {item.visibility && (
                                                <span className="ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs capitalize">
                          {item.visibility}
                        </span>
                                            )}
                                            <span className="ml-auto inline-flex gap-2">
                        {tab === "available" && item.shareId && (
                            <Button
                                size="sm"
                                onClick={() => claimMut.trigger({ shareId: item.shareId! })}
                                disabled={claimMut.isMutating}
                            >
                                {claimMut.isMutating ? "Claiming…" : "Claim"}
                            </Button>
                        )}
                      </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardBody>
                </Card>
            </Container>
        </ProtectedLayout>
    );
}
