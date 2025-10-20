// app/rides/[id]/share/page.tsx
"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import { ArrowLeft, Copy, Link2, Share2, Trash2, X, UserIcon, Users } from "lucide-react";
import DriverCombobox from "@/components/ui/DriverCombobox";
import { dt, KV } from "@/components/ui/commmon";

import {
    useRideShares,
    revokeRideShare,
    getRevokedRideShares,
    type RideShareVisibility,
    type RideShare,
    createRideShare,
    updateRideShare,
} from "@/stores/rideShares";
import { useGroups } from "@/stores/groups";
import { useDriversPublicBatchMap } from "@/stores/users";

type DriverPick = { _id: string; email?: string; name?: string };

const toStr = (v: any) => String(v || "");

export default function RideSharePage() {
    const { id: rideId } = useParams<{ id: string }>();
    const router = useRouter();
    const sp = useSearchParams();

    const [tab, setTab] = useState<"active" | "revoked">("active");

    const {
        data: activeShares = [],
        isLoading: isLoadingActive,
        mutate: mutateActive,
    } = useRideShares(rideId);

    const {
        data: revokedShares = [],
        isLoading: isLoadingRevoked,
        mutate: mutateRevoked,
    } = useSWR<RideShare[]>(
        rideId ? `/rides/${rideId}/share?status=revoked` : null,
        () => getRevokedRideShares(rideId as string)
    );

    const shares = (tab === "active" ? activeShares : revokedShares) || [];
    const isLoading = tab === "active" ? isLoadingActive : isLoadingRevoked;
    const mutate = tab === "active" ? mutateActive : mutateRevoked;

    const selectedShareId = sp.get("shareId") || "";
    const selectedShare = useMemo(
        () => shares.find((s) => s.shareId === selectedShareId) || null,
        [shares, selectedShareId]
    );

    // Create form state
    const [visibility, setVisibility] = useState<RideShareVisibility>("public");
    const [expiresAt, setExpiresAt] = useState<string>("");
    const [maxClaims, setMaxClaims] = useState<string>("");
    const [syncQueue, setSyncQueue] = useState<boolean>(true);
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
    const [pickedDrivers, setPickedDrivers] = useState<DriverPick[]>([]);
    const [creating, setCreating] = useState(false);

    // Edit form state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editState, setEditState] = useState<{
        visibility: RideShareVisibility;
        expiresAt: string;
        maxClaims: string;
        syncQueue: boolean;
        groupIds: string[];
        driverIds: string[];
    }>({
        visibility: "public",
        expiresAt: "",
        maxClaims: "",
        syncQueue: true,
        groupIds: [],
        driverIds: [],
    });

    const [revokingId, setRevokingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { data: groupsData } = useGroups({});
    const groups = groupsData?.items ?? [];
    const groupsById = useMemo(
        () => new Map(groups.map((g: any) => [toStr(g._id), g.name])),
        [groups]
    );

    // Driver map for ALL shares (normalize ids to string!)
    const allShares = [...activeShares, ...revokedShares];
    const allDriverIds = useMemo(
        () => Array.from(new Set(allShares.flatMap((s) => (s.driverIds || []).map(toStr)))),
        [allShares]
    );
    const { map: allDriversMap } = useDriversPublicBatchMap(allDriverIds);

    // Selected share helpers (normalize ids)
    const groupNames = useMemo(() => {
        if (!selectedShare?.groupIds?.length) return [];
        return selectedShare.groupIds.map((id) => groupsById.get(toStr(id)) || toStr(id));
    }, [selectedShare?.groupIds, groupsById]);

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
                driverIds: visibility === "drivers" ? pickedDrivers.map((d) => toStr(d._id)) : undefined,
                expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
                maxClaims: maxClaims ? Number(maxClaims) : undefined,
                syncQueue,
            };
            const created = await createRideShare(rideId, payload);
            await mutateActive();
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

    function startEdit(share: RideShare) {
        setEditingId(share.shareId);
        setEditState({
            visibility: share.visibility,
            expiresAt: share.expiresAt ? new Date(share.expiresAt).toISOString().slice(0, 16) : "",
            maxClaims: typeof share.maxClaims === "number" ? String(share.maxClaims) : "",
            syncQueue: true,
            groupIds: (share.groupIds || []).map(toStr),
            driverIds: (share.driverIds || []).map(toStr),
        });
    }

    async function submitEdit(e: React.FormEvent) {
        e.preventDefault();
        if (!editingId) return;
        setError(null);
        try {
            await updateRideShare(editingId, {
                visibility: editState.visibility,
                groupIds: editState.visibility === "groups" ? editState.groupIds : [],
                driverIds: editState.visibility === "drivers" ? editState.driverIds : [],
                expiresAt: editState.expiresAt ? new Date(editState.expiresAt).toISOString() : null,
                maxClaims: editState.maxClaims ? Number(editState.maxClaims) : null,
                syncQueue: editState.syncQueue,
            });
            await Promise.all([mutateActive(), mutateRevoked()]);
            setEditingId(null);
        } catch (e: any) {
            setError(e?.message || "Failed to update share");
        }
    }

    async function onRevoke(shareId: string) {
        const ok = confirm(`Revoke this share? ${shareId}`);
        if (!ok) return;
        setRevokingId(shareId);
        setError(null);
        try {
            await revokeRideShare(shareId);
            await Promise.all([mutateActive(), mutateRevoked()]);
            if (selectedShareId === shareId) setQueryShareId(undefined);
            setTab("revoked");
        } catch (e: any) {
            setError(e?.message || "Failed to revoke share");
        } finally {
            setRevokingId(null);
        }
    }

    // Remove single driver from selected share (from details view)
    async function onRemoveDriverFromShare(userId: string) {
        if (!selectedShare) return;
        try {
            const remaining = (selectedShare.driverIds || []).map(toStr).filter((id) => id !== userId);
            await updateRideShare(selectedShare.shareId, {
                visibility: "drivers",
                driverIds: remaining,
            });
            await Promise.all([mutateActive(), mutateRevoked()]);
        } catch (e: any) {
            setError(e?.message || "Failed to remove driver");
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
                            <Typography className="text-base sm:text-2xl font-bold text-gray-900">Ride Shares</Typography>
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
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
                                        setEditingId(null);
                                    }}
                                    className={`px-2 py-1 rounded border ${
                                        tab === t ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-gray-200 text-gray-700"
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
                                        const sGroupNames = (s.groupIds || []).map((id) => groupsById.get(toStr(id)) || toStr(id));
                                        const sDriverNames = (s.driverIds || []).map(
                                            (id) => allDriversMap[toStr(id)]?.name || allDriversMap[toStr(id)]?.email || toStr(id)
                                        );

                                        return (
                                            <div
                                                key={s.shareId}
                                                className={`rounded-lg border p-3 bg-white ${isSelected ? "ring-2 ring-indigo-500" : ""} ${
                                                    inactive ? "opacity-75" : ""
                                                }`}
                                            >
                                                <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs capitalize">
                            {s.visibility}
                          </span>
                                                    {typeof s.maxClaims === "number" && (
                                                        <span className="text-xs text-gray-600">Max claims: {s.maxClaims}</span>
                                                    )}
                                                    <span className="text-xs text-gray-600">Expires: {s.expiresAt ? dt(s.expiresAt) : "—"}</span>
                                                    <span className={`text-xs ${inactive ? "text-red-600" : "text-gray-600"}`}>
                            Status: {s.status || "active"}
                          </span>

                                                    <span className="ml-auto inline-flex gap-2">
                            <Button
                                variant={isSelected ? "solid" : "outline"}
                                size="sm"
                                onClick={() => setQueryShareId(isSelected ? undefined : s.shareId)}
                            >
                              {isSelected ? "Showing details" : "Show details"}
                            </Button>
                                                        {tab === "active" && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => startEdit(s)}
                                                                disabled={inactive}
                                                                title={inactive ? "Share is inactive" : "Edit share"}
                                                            >
                                                                Edit
                                                            </Button>
                                                        )}
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

                                                {!!sGroupNames.length && (
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {sGroupNames.map((n) => (
                                                            <span
                                                                key={`g-${s.shareId}-${n}`}
                                                                className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs bg-white"
                                                            >
                                <Users className="w-3.5 h-3.5 mr-1 text-gray-500" />
                                                                {n}
                              </span>
                                                        ))}
                                                    </div>
                                                )}

                                                {!!sDriverNames.length && (
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {sDriverNames.map((n, i) => (
                                                            <span
                                                                key={`d-${s.shareId}-${i}`}
                                                                className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs bg-white"
                                                            >
                                <UserIcon className="w-3.5 h-3.5 mr-1 text-gray-500" />
                                                                {n}
                              </span>
                                                        ))}
                                                    </div>
                                                )}

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

                            {tab === "active" && canCreateAnother && !editingId && (
                                <div className="pt-1">
                                    <Button variant="outline" size="sm" onClick={() => setQueryShareId(undefined)}>
                                        Create New Share
                                    </Button>
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    {/* Selected share details */}
                    {selectedShare && !editingId && (
                        <Card variant="elevated">
                            <CardBody className="p-4 sm:p-6 space-y-4">
                                <Typography className="font-semibold text-gray-900">Share Details</Typography>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                    <KV k="Share ID" v={selectedShare.shareId} />
                                    <KV k="Visibility" v={selectedShare.visibility} />
                                    <KV k="Expires" v={selectedShare.expiresAt ? dt(selectedShare.expiresAt) : "—"} />
                                    <KV
                                        k="Max Claims"
                                        v={typeof selectedShare.maxClaims === "number" ? String(selectedShare.maxClaims) : "—"}
                                    />

                                    {/* Groups */}
                                    {selectedShare.groupIds?.length ? (
                                        <div className="col-span-1 sm:col-span-2">
                                            <div className="text-sm font-medium text-gray-700 mb-1">Groups</div>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedShare.groupIds.map((gid) => {
                                                    const id = toStr(gid);
                                                    const name = groupsById.get(id) || `Group ${id.slice(-6)}`;
                                                    return (
                                                        <span
                                                            key={id}
                                                            className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs bg-white"
                                                        >
                              <Users className="w-3.5 h-3.5 text-gray-500" />
                                                            {name}
                            </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : null}

                                    {/* Drivers with remove buttons (active only) */}
                                    {selectedShare.driverIds?.length ? (
                                        <div className="col-span-1 sm:col-span-2">
                                            <div className="text-sm font-medium text-gray-700 mb-1">Drivers</div>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedShare.driverIds.map((uidAny) => {
                                                    const uid = toStr(uidAny);
                                                    const d = allDriversMap[uid];
                                                    const display = d?.name || d?.email || `User ${uid.slice(-6)}`;
                                                    return (
                                                        <span
                                                            key={uid}
                                                            className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs bg-white"
                                                            title={d?.email || uid}
                                                        >
                              <UserIcon className="w-3.5 h-3.5 text-gray-500" />
                              <Link href={`/users/${uid}`} className="hover:underline font-medium text-gray-900">
                                {display}
                              </Link>
                                                            {tab === "active" && (
                                                                <button
                                                                    type="button"
                                                                    className="p-0.5 rounded hover:bg-gray-100"
                                                                    onClick={() => onRemoveDriverFromShare(uid)}
                                                                    aria-label={`Remove ${display}`}
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                            </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : null}

                                    <KV k="Status" v={selectedShare.status} />
                                </div>
                            </CardBody>
                        </Card>
                    )}

                    {/* Edit share form */}
                    {editingId && (
                        <Card variant="elevated">
                            <CardBody className="p-4 sm:p-6 space-y-6">
                                <form onSubmit={submitEdit} className="space-y-6">
                                    <Typography className="text-sm font-semibold text-gray-900">Edit Share</Typography>

                                    <div className="flex flex-wrap gap-4 text-sm">
                                        {(["public", "groups", "drivers"] as RideShareVisibility[]).map((v) => (
                                            <label key={v} className="inline-flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="edit-visibility"
                                                    value={v}
                                                    checked={editState.visibility === v}
                                                    onChange={() => setEditState((s) => ({ ...s, visibility: v }))}
                                                />
                                                {v}
                                            </label>
                                        ))}
                                    </div>

                                    {editState.visibility === "groups" && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {groups.map((g: any) => {
                                                const gid = toStr(g._id);
                                                const checked = editState.groupIds.includes(gid);
                                                return (
                                                    <label
                                                        key={gid}
                                                        className="inline-flex items-center gap-2 text-sm border rounded-md px-2 py-1"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={(e) =>
                                                                setEditState((s) => ({
                                                                    ...s,
                                                                    groupIds: e.target.checked
                                                                        ? [...s.groupIds, gid]
                                                                        : s.groupIds.filter((x) => x !== gid),
                                                                }))
                                                            }
                                                        />
                                                        <span className="truncate">{g.name}</span>
                                                    </label>
                                                );
                                            })}
                                            {!groups.length && <div className="text-sm text-gray-600">No groups yet.</div>}
                                        </div>
                                    )}

                                    {editState.visibility === "drivers" && (
                                        <div className="flex flex-col gap-3">
                                            <DriverCombobox
                                                id="edit-driver-pick"
                                                valueEmail=""
                                                onChange={(driver: any | null) => {
                                                    const id = toStr(driver?._id);
                                                    if (id && !editState.driverIds.includes(id)) {
                                                        setEditState((s) => ({ ...s, driverIds: [...s.driverIds, id] }));
                                                    }
                                                }}
                                            />
                                            <div className="flex flex-wrap gap-2">
                                                {editState.driverIds.map((id) => {
                                                    const n = allDriversMap[id]?.name || allDriversMap[id]?.email || `User ${id.slice(-6)}`;
                                                    return (
                                                        <span
                                                            key={id}
                                                            className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs bg-white"
                                                        >
                              <UserIcon className="w-3.5 h-3.5 mr-1 text-gray-500" />
                                                            {n}
                                                            <button
                                                                type="button"
                                                                className="ml-1 p-0.5 rounded hover:bg-gray-100"
                                                                onClick={() =>
                                                                    setEditState((s) => ({ ...s, driverIds: s.driverIds.filter((x) => x !== id) }))
                                                                }
                                                                aria-label={`Remove ${id}`}
                                                            >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Expires At (optional)</label>
                                            <input
                                                type="datetime-local"
                                                value={editState.expiresAt}
                                                onChange={(e) => setEditState((s) => ({ ...s, expiresAt: e.target.value }))}
                                                className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 border-gray-300"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Max Claims (optional)</label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={editState.maxClaims}
                                                onChange={(e) => setEditState((s) => ({ ...s, maxClaims: e.target.value }))}
                                                className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 border-gray-300"
                                                placeholder="e.g., 1"
                                            />
                                        </div>

                                        <label className="mt-6 inline-flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={editState.syncQueue}
                                                onChange={(e) => setEditState((s) => ({ ...s, syncQueue: e.target.checked }))}
                                            />
                                            Sync queue with visibility
                                        </label>
                                    </div>

                                    <div className="flex gap-3">
                                        <Button type="button" variant="outline" onClick={() => setEditingId(null)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit">Save Changes</Button>
                                    </div>
                                </form>
                            </CardBody>
                        </Card>
                    )}

                    {/* Create new share form */}
                    {!selectedShare && tab === "active" && !editingId && (
                        <Card variant="elevated">
                            <CardBody className="p-4 sm:p-6 space-y-6">
                                <form onSubmit={onCreate} className="space-y-6">
                                    <div>
                                        <Typography className="text-sm font-semibold text-gray-900">Visibility</Typography>
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
                                            <Typography className="text-sm font-semibold text-gray-900">Select Groups</Typography>
                                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {groups.map((g) => {
                                                    const gid = toStr(g._id);
                                                    const checked = selectedGroupIds.includes(gid);
                                                    return (
                                                        <label
                                                            key={gid}
                                                            className="inline-flex items-center gap-2 text-sm border rounded-md px-2 py-1"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={(e) =>
                                                                    setSelectedGroupIds((prev) =>
                                                                        e.target.checked ? [...prev, gid] : prev.filter((x) => x !== gid)
                                                                    )
                                                                }
                                                            />
                                                            <span className="truncate">{g.name}</span>
                                                        </label>
                                                    );
                                                })}
                                                {!groups.length && <div className="text-sm text-gray-600">No groups yet.</div>}
                                            </div>
                                        </div>
                                    )}

                                    {visibility === "drivers" && (
                                        <div>
                                            <Typography className="text-sm font-semibold text-gray-900">Select Drivers</Typography>

                                            <div className="mt-2 flex flex-col gap-3">
                                                <DriverCombobox
                                                    id="driver-pick"
                                                    valueEmail=""
                                                    onChange={(driver: any | null) => {
                                                        const id = toStr(driver?._id);
                                                        if (id && !pickedDrivers.some((d) => toStr(d._id) === id)) {
                                                            setPickedDrivers((prev) => [
                                                                ...prev,
                                                                {
                                                                    _id: id,
                                                                    name: driver.name,
                                                                    email: driver.email,
                                                                },
                                                            ]);
                                                        }
                                                    }}
                                                />

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
                              <UserIcon className="w-3.5 h-3.5 mr-1 text-gray-500" />
                              <span className="font-medium text-gray-900 truncate max-w-[10rem]">
                                {d.name || d.email || `User ${toStr(d._id).slice(-6)}`}
                              </span>
                              <button
                                  type="button"
                                  className="p-0.5 rounded hover:bg-gray-100"
                                  onClick={() => setPickedDrivers((prev) => prev.filter((x) => x._id !== d._id))}
                                  aria-label={`Remove ${d._id}`}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Expires At (optional)</label>
                                            <input
                                                type="datetime-local"
                                                value={expiresAt}
                                                onChange={(e) => setExpiresAt(e.target.value)}
                                                className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 border-gray-300"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Max Claims (optional)</label>
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
                                        <Button type="button" variant="outline" onClick={() => router.push(`/rides/${rideId}`)}>
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
