import { Button, Card, CardBody, Typography } from "@/components/ui";
import { fmtDate, fmtTime } from "@/services/convertors";
import { useApproveRideClaim, useRejectRideClaim, useRideClaims } from "@/stores/rideClaims";
import { useRide } from "@/stores/rides";
import { useDriversPublicBatchMap } from "@/stores/users";
import { Check, Loader2, UserIcon, Users, XIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function PendingDriverRequests({
    id,
    requestsRef,
}: {
    id: string;
    requestsRef: React.RefObject<HTMLDivElement>;
}) {
    const { mutate } = useRide(id);
    const { data: claims = [], isLoading: claimsLoading, mutate: mutateClaims } = useRideClaims(id);

    const queuedClaims = useMemo(
        () =>
            claims
                .filter((c) => c.status === "queued")
                .slice()
                .sort((a: any, b: any) => {
                    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return ta - tb;
                }),
        [claims]
    );
    const hasQueuedClaims = queuedClaims.length > 0;

    const approvedClaim = useMemo(() => claims.find((c) => c.status === "approved"), [claims]);

    const [error, setError] = useState<string | null>(null);

    const { approve, isApproving } = useApproveRideClaim(id);
    const { reject, isRejecting } = useRejectRideClaim(id);

    async function onApproveClaim(claimId: string) {
        try {
            setError(null);
            await approve(claimId);
            await Promise.all([mutate(), mutateClaims()]);
        } catch (e: any) {
            setError(e?.message || "Failed to approve request");
        }
    }

    async function onRejectClaim(claimId: string) {
        try {
            setError(null);
            await reject(claimId);
            await mutateClaims();
        } catch (e: any) {
            setError(e?.message || "Failed to reject request");
        }
    }

    // Resolve driver names/emails for all claims
    const claimDriverIds = useMemo(
        () => Array.from(new Set(claims.map((c) => c.driverId))),
        [claims]
    );

    const { map: claimDriversMap, isLoading: claimDriversLoading } =
        useDriversPublicBatchMap(claimDriverIds);

    return (
        <div ref={requestsRef}>
            <Card variant="elevated">
                <CardBody className="p-4 md:p-6 space-y-3">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-600" />
                        <Typography className="font-semibold text-gray-900">
                            Pending driver requests
                        </Typography>
                        {hasQueuedClaims && (
                            <span className="ml-auto inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                                {queuedClaims.length} pending
                            </span>
                        )}
                        {approvedClaim && (
                            <span className="ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs bg-green-50 text-green-700 border-green-200">
                                <Check className="w-3.5 h-3.5 mr-1" />
                                Approved driver selected
                            </span>
                        )}
                    </div>

                    {claimsLoading ? (
                        <div className="text-sm text-gray-600 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading requests…
                        </div>
                    ) : queuedClaims.length === 0 ? (
                        <div className="text-sm text-gray-600">No pending driver requests.</div>
                    ) : (
                        <div className="space-y-2">
                            {queuedClaims.map((c: any, idx: number) => {
                                const d = claimDriversMap[c.driverId];
                                const name = d?.name || `User ${c.driverId.slice(-6)}`;
                                const email = d?.email;

                                return (
                                    <div
                                        key={c.claimId}
                                        className="flex flex-wrap items-center gap-2 justify-between rounded-lg border p-2 bg-white"
                                    >
                                        <div className="min-w-0 flex items-start gap-2">
                                            {/* queue index */}
                                            <span className="mt-0.5 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">
                                                #{idx + 1}
                                            </span>
                                            <UserIcon className="w-4 h-4 text-gray-500 mt-0.5" />
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium text-gray-900 truncate">
                                                    <Link
                                                        href={`/users/${c.driverId}`}
                                                        className="hover:underline"
                                                    >
                                                        {name}
                                                    </Link>
                                                </div>
                                                <div className="text-xs text-gray-600 truncate">
                                                    {email || "—"}
                                                </div>
                                                {c.createdAt && (
                                                    <div className="text-xs md:text-sm text-gray-500 mt-1">
                                                        Requested {fmtDate(c.createdAt)} •{" "}
                                                        {fmtTime(c.createdAt)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() => onApproveClaim(c.claimId)}
                                                disabled={isApproving}
                                                className="text-xs py-1 px-2 bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
                                                leftIcon={
                                                    isApproving ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Check className="w-4 h-4" />
                                                    )
                                                }
                                            >
                                                Approve
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => onRejectClaim(c.claimId)}
                                                disabled={isRejecting}
                                                className="text-xs py-1 px-2 border-amber-400 text-amber-700 hover:bg-amber-50 focus:ring-amber-500"
                                                leftIcon={
                                                    isRejecting ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <XIcon className="w-4 h-4" />
                                                    )
                                                }
                                            >
                                                Reject
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {claimDriversLoading && queuedClaims.length > 0 && (
                        <div className="text-xs text-gray-600">Loading driver info…</div>
                    )}

                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                            {error}
                        </div>
                    )}
                </CardBody>
            </Card>
        </div>
    );
}
