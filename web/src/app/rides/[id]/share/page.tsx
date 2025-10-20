// app/rides/[id]/share/page.tsx
"use client";

import {useMemo, useState} from "react";
import useSWR from "swr";
import {useParams, useRouter, useSearchParams} from "next/navigation";
import Link from "next/link";
import ProtectedLayout from "@/components/ProtectedLayout";
import {Button, Card, CardBody, Container, Typography} from "@/components/ui";
import {ArrowLeft, Copy, Link2, Share2, Trash2} from "lucide-react";
import DriverCombobox from "@/components/ui/DriverCombobox";
import {dt, KV} from "@/components/ui/commmon";

import {
    useRideShares,
    useCreateRideShare,
    type RideShareVisibility,
    revokeRideShare,
    getRevokedRideShares,
    type RideShare, createRideShare,
} from "@/stores/rideShares";
import {useGroups} from "@/stores/groups";

type DriverPick = { _id: string; email?: string; name?: string };

export default function RideSharePage() {
    const { id: rideId } = useParams<{ id: string }>();
    const router = useRouter();
    const sp = useSearchParams();

    // Tab: "active" | "revoked"
    const [tab, setTab] = useState<"active" | "revoked">("active");

    // Active shares
    const {
        data: activeShares = [],
        isLoading: isLoadingActive,
        mutate: mutateActive,
    } = useRideShares(rideId);

    // Revoked shares
    const {
        data: revokedShares = [],
        isLoading: isLoadingRevoked,
        mutate: mutateRevoked,
    } = useSWR<RideShare[]>(
        rideId ? `/rides/${rideId}/share?status=revoked` : null,
        () => getRevokedRideShares(rideId as string)
    );

    // current list according to tab
    const shares = (tab === "active" ? activeShares : revokedShares) || [];
    const isLoading = tab === "active" ? isLoadingActive : isLoadingRevoked;
    const mutate = tab === "active" ? mutateActive : mutateRevoked;

    const selectedShareId = sp.get("shareId") || "";
    const selectedShare = useMemo(
        () => shares.find((s) => s.shareId === selectedShareId) || null,
        [shares, selectedShareId]
    );

    const [visibility, setVisibility] = useState<RideShareVisibility>("public");
    const [expiresAt, setExpiresAt] = useState<string>("");
    const [maxClaims, setMaxClaims] = useState<string>("");
    const [syncQueue, setSyncQueue] = useState<boolean>(true);
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
    const [pickedDrivers, setPickedDrivers] = useState<DriverPick[]>([]);
    const [creating, setCreating] = useState(false);
    const [revokingId, setRevokingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { data: groupsData } = useGroups({});
    const groups = groupsData?.items ?? [];

    function setQueryShareId(shareId?: string) {
        const base = `/rides/${rideId}/share`;
        router.replace(shareId ? `${base}?shareId=${encodeURIComponent(shareId)}` : base);
    }

    async function onCreate(e: React.FormEvent) {
        e.preventDefault();
        setCreating(true);
        setError(null);
        try {
            const payload = {
                visibility,
                groupIds: visibility === "groups" ? selectedGroupIds : undefined,
                driverIds: visibility === "drivers" ? pickedDrivers.map((d) => d._id) : undefined,
                expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
                maxClaims: maxClaims ? Number(maxClaims) : undefined,
                syncQueue,
            };
            // NOTE: using your existing hook usage as-is:
            const created = await createRideShare(rideId, payload);
            await mutateActive(); // new share affects the "active" tab
            setTab("active");
            setQueryShareId(created.shareId);
            setSelectedGroupIds([]);
            setPickedDrivers([]);
            setMaxClaims("");
            setExpiresAt("");
        } catch (e: any) {
            setError(e?.message || "Failed to create share");
        } finally {
            setCreating(false);
        }
    }

    async function onRevoke(shareId: string) {
        const ok = confirm(`Revoke this share? ${shareId}`);
        if (!ok) return;
        setRevokingId(shareId);
        setError(null);
        try {
            await revokeRideShare(shareId);
            // revalidate both tabs because revoking moves items from active → revoked
            await Promise.all([mutateActive(), mutateRevoked()]);
            if (selectedShareId === shareId) setQueryShareId(undefined);
            setTab("revoked");
        } catch (e: any) {
            setError(e?.message || "Failed to revoke share");
        } finally {
            setRevokingId(null);
        }
    }

    const canCreateAnother = true;

    return (
        <ProtectedLayout>
            <Container className="px-3 sm:px-6 lg:px-8">
                <div className="space-y-4 sm:space-y-6">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                                <Link href={`/rides/${rideId}`}>Back</Link>
                            </Button>
                            <Typography className="text-base sm:text-2xl font-bold text-gray-900">
                                Ride Shares
                            </Typography>
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-indigo-600" />
                        <div className="ml-auto flex gap-1 text-xs">
                            {(["active", "revoked"] as const).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => {
                                        setTab(t);
                                        setQueryShareId(undefined);
                                    }}
                                    className={`px-2 py-1 rounded border ${
                                        tab === t
                                            ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                                            : "bg-white border-gray-200 text-gray-700"
                                    }`}
                                >
                                    {t === "active" ? "Active" : "Revoked"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Shares list */}
                    <Card variant="elevated">
                        <CardBody className="p-4 sm:p-6 space-y-3">
                            <div className="flex items-center gap-2">
                                <Typography className="font-semibold text-gray-900">
                                    {tab === "active" ? "Active Shares" : "Revoked Shares"}
                                </Typography>
                            </div>

                            {isLoading ? (
                                <div className="text-sm text-gray-600">Loading…</div>
                            ) : shares.length === 0 ? (
                                <div className="text-sm text-gray-600">
                                    {tab === "active" ? "No active shares." : "No revoked shares."}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {shares.map((s) => {
                                        const isSelected = s.shareId === selectedShareId;
                                        const inactive = s.status !== "active";
                                        return (
                                            <div
                                                key={s.shareId}
                                                className={`rounded-lg border p-3 bg-white ${
                                                    isSelected ? "ring-2 ring-indigo-500" : ""
                                                } ${inactive ? "opacity-75" : ""}`}
                                            >
                                                <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs capitalize">
                            {s.visibility}
                          </span>
                                                    {typeof s.maxClaims === "number" && (
                                                        <span className="text-xs text-gray-600">Max claims: {s.maxClaims}</span>
                                                    )}
                                                    <span className="text-xs text-gray-600">
                            Expires: {s.expiresAt ? dt(s.expiresAt) : "—"}
                          </span>
                                                    <span
                                                        className={`text-xs ${
                                                            inactive ? "text-red-600" : "text-gray-600"
                                                        }`}
                                                    >
                            Status: {s.status || "active"}
                          </span>

                                                    <span className="ml-auto inline-flex gap-2">
                            <Button
                                variant={isSelected ? "solid" : "outline"}
                                size="sm"
                                onClick={() =>
                                    setQueryShareId(isSelected ? undefined : s.shareId)
                                }
                            >
                              {isSelected ? "Managing" : "Manage"}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<Trash2 className="w-4 h-4" />}
                                onClick={() => onRevoke(s.shareId)}
                                disabled={revokingId === s.shareId || inactive}
                                title={inactive ? "Already revoked" : "Revoke"}
                            >
                              {revokingId === s.shareId ? "Revoking…" : "Revoke"}
                            </Button>
                          </span>
                                                </div>

                                                {/* URL row (will be shown only if provided by API; revoked usually won't have it) */}
                                                {Boolean((s as any).url) && (
                                                    <div className="mt-2 flex items-center gap-2 rounded-md border p-2">
                                                        <Link2 className="w-4 h-4 text-gray-500 shrink-0" />
                                                        <div className="truncate text-sm">{(s as any).url}</div>
                                                        <button
                                                            type="button"
                                                            className="ml-auto inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                                                            onClick={() => navigator.clipboard.writeText((s as any).url!)}
                                                        >
                                                            <Copy className="w-3.5 h-3.5" /> Copy
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Create New for Active tab only */}
                            {tab === "active" && (
                                <div className="pt-1">
                                    <Button variant="outline" size="sm" onClick={() => setQueryShareId(undefined)}>
                                        Create New Share
                                    </Button>
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    {/* Selected share details (read-only) */}
                    {selectedShare && (
                        <Card variant="elevated">
                            <CardBody className="p-4 sm:p-6 space-y-4">
                                <Typography className="font-semibold text-gray-900">Share Details</Typography>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                    <KV k="Share ID" v={selectedShare.shareId} />
                                    <KV k="Visibility" v={selectedShare.visibility} />
                                    <KV
                                        k="Expires"
                                        v={selectedShare.expiresAt ? dt(selectedShare.expiresAt) : "—"}
                                    />
                                    <KV
                                        k="Max Claims"
                                        v={
                                            typeof selectedShare.maxClaims === "number"
                                                ? String(selectedShare.maxClaims)
                                                : "—"
                                        }
                                    />
                                    {selectedShare.groupIds?.length ? (
                                        <KV k="Groups" v={`${selectedShare.groupIds.length}`} />
                                    ) : null}
                                    {selectedShare.driverIds?.length ? (
                                        <KV k="Drivers" v={`${selectedShare.driverIds.length}`} />
                                    ) : null}
                                    <KV k="Status" v={selectedShare.status} />
                                </div>
                            </CardBody>
                        </Card>
                    )}

                    {/* Create new share form (only when no selection & on Active tab) */}
                    {!selectedShare && tab === "active" && (
                        <Card variant="elevated">
                            <CardBody className="p-4 sm:p-6 space-y-6">
                                <form onSubmit={onCreate} className="space-y-6">
                                    <div>
                                        <Typography className="text-sm font-semibold text-gray-900">
                                            Visibility
                                        </Typography>
                                        <div className="mt-2 flex flex-wrap gap-4 text-sm">
                                            {(["public", "groups", "drivers"] as RideShareVisibility[]).map((v) => (
                                                <label key={v} className="inline-flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name="visibility"
                                                        value={v}
                                                        checked={visibility === v}
                                                        onChange={() => setVisibility(v)}
                                                    />
                                                    {v}
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {visibility === "groups" && (
                                        <div>
                                            <Typography className="text-sm font-semibold text-gray-900">
                                                Select Groups
                                            </Typography>
                                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {groups.map((g) => {
                                                    const checked = selectedGroupIds.includes(g._id);
                                                    return (
                                                        <label
                                                            key={g._id}
                                                            className="inline-flex items-center gap-2 text-sm border rounded-md px-2 py-1"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={(e) =>
                                                                    setSelectedGroupIds((prev) =>
                                                                        e.target.checked
                                                                            ? [...prev, g._id]
                                                                            : prev.filter((x) => x !== g._id)
                                                                    )
                                                                }
                                                            />
                                                            <span className="truncate">{g.name}</span>
                                                        </label>
                                                    );
                                                })}
                                                {!groups.length && (
                                                    <div className="text-sm text-gray-600">No groups yet.</div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {visibility === "drivers" && (
                                        <div>
                                            <Typography className="text-sm font-semibold text-gray-900">
                                                Select Drivers
                                            </Typography>

                                            <div className="mt-2 flex flex-col gap-3">
                                                <DriverCombobox
                                                    id="driver-pick"
                                                    valueEmail=""
                                                    onChange={(driver: any | null) => {
                                                        if (
                                                            driver &&
                                                            driver._id &&
                                                            !pickedDrivers.some((d) => d._id === driver._id)
                                                        ) {
                                                            setPickedDrivers((prev) => [
                                                                ...prev,
                                                                {
                                                                    _id: driver._id,
                                                                    name: driver.name,
                                                                    email: driver.email,
                                                                },
                                                            ]);
                                                        }
                                                    }}
                                                />

                                                {/* Chips */}
                                                <div className="flex flex-wrap gap-2">
                                                    {pickedDrivers.length === 0 && (
                                                        <div className="text-sm text-gray-600">No drivers selected.</div>
                                                    )}
                                                    {pickedDrivers.map((d) => (
                                                        <span
                                                            key={d._id}
                                                            className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs bg-white"
                                                            title={d.email || d._id}
                                                        >
                              <span className="font-medium text-gray-900 truncate max-w-[10rem]">
                                {d.name || d.email || `User ${d._id.slice(-6)}`}
                              </span>
                              <button
                                  type="button"
                                  className="p-0.5 rounded hover:bg-gray-100"
                                  onClick={() =>
                                      setPickedDrivers((prev) =>
                                          prev.filter((x) => x._id !== d._id)
                                      )
                                  }
                                  aria-label={`Remove ${d._id}`}
                              >
                                ×
                              </button>
                            </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Expires At (optional)
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={expiresAt}
                                                onChange={(e) => setExpiresAt(e.target.value)}
                                                className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 border-gray-300"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Max Claims (optional)
                                            </label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={maxClaims}
                                                onChange={(e) => setMaxClaims(e.target.value)}
                                                className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 border-gray-300"
                                                placeholder="e.g., 1"
                                            />
                                        </div>

                                        <label className="mt-6 inline-flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={syncQueue}
                                                onChange={(e) => setSyncQueue(e.target.checked)}
                                            />
                                            Sync queue with visibility
                                        </label>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => router.push(`/rides/${rideId}`)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={creating}>
                                            {creating ? "Creating…" : "Create Share"}
                                        </Button>
                                    </div>
                                </form>
                            </CardBody>
                        </Card>
                    )}
                </div>
            </Container>
        </ProtectedLayout>
    );
}
