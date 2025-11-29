// components/ui/ride/RideShareQuickPanel.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Share2, Copy, Link2, Users, UserIcon, ChevronDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui";
import {
    useRideShares,
    createRideShare,
    updateRideShare,
    type RideShare,
    type RideShareVisibility,
} from "@/stores/rideShares";
import { useGroups } from "@/stores/groups";
import { useDriversPublicBatchMap } from "@/stores/users";
import { DriverCombobox, type SimpleDriver } from "@/components/ui/ride/DriverCombobox";

type RideShareQuickPanelProps = {
    rideId: string;
    className?: string;
};

type CreateMode = "public" | "group" | "drivers";

const toStr = (v: any) => String(v ?? "");

function pickPrimary(shares: RideShare[]): RideShare | null {
    if (!shares?.length) return null;
    const active = shares.filter((s) => s.status === "active");
    const src = active.length ? active : shares;
    return src.find((s) => s.visibility === "public") || src[0] || null;
}

function formatVisibility(v: RideShareVisibility): string {
    if (v === "public") return "Public link";
    if (v === "groups") return "Groups only";
    if (v === "drivers") return "Drivers only";
    return v;
}

export default function RideShareQuickPanel({ rideId, className = "" }: RideShareQuickPanelProps) {
    const { data: shares = [], isLoading: isLoadingShares, mutate } = useRideShares(rideId);

    const { data: groupsData } = useGroups({});
    const groups = groupsData?.items ?? [];

    const activeShares = useMemo(() => shares.filter((s) => s.status === "active"), [shares]);

    const primary = useMemo(() => pickPrimary(shares), [shares]);
    const hasPrimary = !!primary;
    const url = hasPrimary ? ((primary as any).url as string | undefined) : undefined;
    const visibilityLabel = hasPrimary ? formatVisibility(primary!.visibility) : null;

    const publicShareExists = useMemo(
        () => activeShares.some((s) => s.visibility === "public"),
        [activeShares]
    );

    // Keep public + group counts as "shares"
    const shareCounts = useMemo(() => {
        const res = { public: 0, groups: 0 };
        for (const s of activeShares) {
            if (s.visibility === "public") res.public += 1;
            if (s.visibility === "groups") res.groups = s.groupIds.length;
        }
        return res;
    }, [activeShares]);

    const totalActive = activeShares.length;

    const [createMode, setCreateMode] = useState<CreateMode>("public");
    const [creating, setCreating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Group multi-select
    const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
    const [groupSearch, setGroupSearch] = useState("");
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

    // Drivers: existing driver-shares and “new drivers to share with”
    const driverShares = useMemo(
        () => activeShares.filter((s) => s.visibility === "drivers"),
        [activeShares]
    );

    const driverIdsInShares = useMemo(
        () =>
            Array.from(
                new Set(driverShares.flatMap((s) => (s.driverIds || []).map((id) => toStr(id))))
            ),
        [driverShares]
    );

    const { map: driversMap } = useDriversPublicBatchMap(driverIdsInShares);

    const [driverValues, setDriverValues] = useState<SimpleDriver[]>([]);
    const [removingDriverId, setRemovingDriverId] = useState<string | null>(null);

    const driverCount = driverIdsInShares.length; // <- “Drivers X” now counts drivers, not shares

    const groupNameById = useMemo(
        () => new Map(groups.map((g: any) => [toStr(g._id), g.name as string])),
        [groups]
    );

    const filteredGroups = useMemo(() => {
        const q = groupSearch.trim().toLowerCase();
        if (!q) return groups;
        return groups.filter((g: any) => {
            const name = String(g.name || "").toLowerCase();
            const city = String(g.city || "").toLowerCase();
            const tags = String(g.tags || "").toLowerCase();
            return name.includes(q) || city.includes(q) || tags.includes(q);
        });
    }, [groups, groupSearch]);

    function hasActiveGroupShareFor(groupId: string): boolean {
        return activeShares.some(
            (s) =>
                s.visibility === "groups" &&
                s.status === "active" &&
                (s.groupIds || []).some((gid) => toStr(gid) === groupId)
        );
    }

    function hasActiveDriverShareFor(userId: string): boolean {
        return driverShares.some((s) => (s.driverIds || []).some((uid) => toStr(uid) === userId));
    }

    const anySelectedGroupWithoutShare = selectedGroupIds.some(
        (gid) => !hasActiveGroupShareFor(gid)
    );

    async function handleCopy() {
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // ignore
        }
    }

    async function handleCreatePublic() {
        if (publicShareExists) return;
        setCreating(true);
        setError(null);
        try {
            const payload = {
                visibility: "public" as RideShareVisibility,
                groupIds: undefined,
                driverIds: undefined,
                expiresAt: null,
                maxClaims: undefined,
                syncQueue: true,
            };
            await createRideShare(rideId, payload);
            await mutate();
        } catch (e: any) {
            setError(e?.message || "Failed to create public share");
        } finally {
            setCreating(false);
        }
    }

    async function handleCreateGroupShare() {
        const newIds = selectedGroupIds.filter((id) => !hasActiveGroupShareFor(id));
        if (!newIds.length) return;

        setCreating(true);
        setError(null);
        try {
            const payload = {
                visibility: "groups" as RideShareVisibility,
                groupIds: newIds,
                driverIds: undefined,
                expiresAt: null,
                maxClaims: undefined,
                syncQueue: true,
            };
            await createRideShare(rideId, payload);
            await mutate();
            setSelectedGroupIds([]);
            setGroupDropdownOpen(false);
        } catch (e: any) {
            setError(e?.message || "Failed to create group share");
        } finally {
            setCreating(false);
        }
    }

    async function handleCreateDriverShare(drivers: SimpleDriver[]) {
        if (!drivers.length) return;

        const newDrivers = drivers.filter((d) => !hasActiveDriverShareFor(d.id));
        if (newDrivers.length === 0) {
            setError("All selected drivers already have active shares for this ride.");
            return;
        }

        setCreating(true);
        setError(null);
        try {
            const payload = {
                visibility: "drivers" as RideShareVisibility,
                groupIds: undefined,
                driverIds: newDrivers.map((d) => d.id),
                expiresAt: null,
                maxClaims: undefined,
                syncQueue: true,
            };
            await createRideShare(rideId, payload);
            await mutate();
            setDriverValues([]);
        } catch (e: any) {
            setError(e?.message || "Failed to create drivers share");
        } finally {
            setCreating(false);
        }
    }

    // IMPORTANT: use updateRideShare only, no revoke here.
    // Matches semantics of onRemoveDriverFromShare in /share page.
    async function handleRemoveDriverFromShares(userId: string) {
        setRemovingDriverId(userId);
        setError(null);
        try {
            const affected = driverShares.filter((s) =>
                (s.driverIds || []).some((uid) => toStr(uid) === userId)
            );

            const ops: Promise<any>[] = [];

            for (const s of affected) {
                const remaining = (s.driverIds || [])
                    .map((id) => toStr(id))
                    .filter((id) => id !== userId);

                ops.push(
                    updateRideShare(s.shareId, {
                        visibility: "drivers",
                        driverIds: remaining,
                    })
                );
            }

            if (ops.length) {
                await Promise.all(ops);
            }
        } catch (e: any) {
            setError(e?.message || "Failed to remove driver from share");
        } finally {
            setRemovingDriverId(null);
            await mutate(); // always refresh, even if backend already deleted/revoked
        }
    }

    return (
        <div
            className={[
                "rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs sm:text-sm",
                "flex flex-col gap-2",
                className,
            ].join(" ")}
        >
            {/* Header / status */}
            <div className="flex items-start gap-2">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50">
                    <Share2 className="h-4 w-4 text-indigo-600" />
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="font-medium text-gray-900">Share this ride</div>
                        {totalActive > 0 && (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">
                                {totalActive} active share{totalActive > 1 ? "s" : ""}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                        {isLoadingShares && <span>Loading shares…</span>}

                        {!isLoadingShares && totalActive > 0 && (
                            <>
                                <span>
                                    Public {shareCounts.public} • Groups {shareCounts.groups} •
                                    Drivers {driverCount}
                                </span>
                                {hasPrimary && (
                                    <>
                                        <span className="h-1 w-1 rounded-full bg-gray-300" />
                                        <span className="inline-flex items-center gap-1 truncate max-w-[12rem]">
                                            <Link2 className="h-3 w-3 shrink-0" />
                                            <span className="truncate">{url || "No URL"}</span>
                                        </span>
                                        <span className="h-1 w-1 rounded-full bg-gray-300" />
                                        <span>{visibilityLabel}</span>
                                    </>
                                )}
                            </>
                        )}

                        {!isLoadingShares && totalActive === 0 && (
                            <span>No active shares yet.</span>
                        )}
                    </div>
                </div>

                {/* Right-hand actions */}
                <div className="flex flex-col items-end gap-1">
                    {hasPrimary && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopy}
                            disabled={!url}
                            className="px-2 py-1 text-[11px] sm:text-xs"
                            leftIcon={<Copy className="h-3 w-3" />}
                        >
                            {copied ? "Copied" : "Copy"}
                        </Button>
                    )}
                    <Link href={`/rides/${rideId}/share`} className="mt-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="px-2 py-1 text-[11px] sm:text-xs text-indigo-700 hover:text-indigo-800"
                        >
                            Manage
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Mode toggle */}
            {!isLoadingShares && (
                <div className="mt-1 inline-flex rounded-full bg-gray-50 p-0.5 text-[11px]">
                    <button
                        type="button"
                        onClick={() => setCreateMode("public")}
                        className={[
                            "px-2 py-1 rounded-full",
                            createMode === "public"
                                ? "bg-white shadow text-gray-900"
                                : "text-gray-600",
                        ].join(" ")}
                    >
                        Public
                    </button>
                    <button
                        type="button"
                        onClick={() => setCreateMode("group")}
                        className={[
                            "px-2 py-1 rounded-full",
                            createMode === "group"
                                ? "bg-white shadow text-gray-900"
                                : "text-gray-600",
                        ].join(" ")}
                    >
                        Groups
                    </button>
                    <button
                        type="button"
                        onClick={() => setCreateMode("drivers")}
                        className={[
                            "px-2 py-1 rounded-full",
                            createMode === "drivers"
                                ? "bg-white shadow text-gray-900"
                                : "text-gray-600",
                        ].join(" ")}
                    >
                        Drivers
                    </button>
                </div>
            )}

            {/* Public mode */}
            {createMode === "public" && !isLoadingShares && (
                <div className="mt-1 flex flex-col gap-1">
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleCreatePublic}
                        disabled={creating || publicShareExists}
                        className="w-full justify-center gap-2 text-xs sm:text-sm"
                        leftIcon={<Share2 className="h-3.5 w-3.5" />}
                    >
                        {publicShareExists
                            ? "Public share already exists"
                            : creating
                              ? "Creating public share…"
                              : "Create public share"}
                    </Button>
                    <span className="text-[11px] text-gray-500">
                        Creates a public link anyone with the URL can open.
                    </span>
                </div>
            )}

            {/* Group mode */}
            {createMode === "group" && !isLoadingShares && (
                <div className="mt-1 space-y-2">
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setGroupDropdownOpen((open) => !open)}
                            className="inline-flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-left text-xs sm:text-sm"
                        >
                            <span className="flex flex-col">
                                <span className="font-medium text-gray-800">
                                    {selectedGroupIds.length > 0
                                        ? `${selectedGroupIds.length} group${selectedGroupIds.length > 1 ? "s" : ""} selected`
                                        : "Select groups"}
                                </span>
                                <span className="text-[11px] text-gray-500">
                                    {selectedGroupIds.length > 0
                                        ? "You can select multiple groups"
                                        : "Share with specific groups"}
                                </span>
                            </span>
                            <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                        </button>

                        {groupDropdownOpen && (
                            <div className="absolute z-40 mt-1 w-full rounded-lg border border-gray-100 bg-white shadow-lg">
                                <div className="border-b border-gray-100 p-2">
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            className="w-full rounded-md border border-gray-200 bg-gray-50 pl-7 pr-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            placeholder="Search groups…"
                                            value={groupSearch}
                                            onChange={(e) => setGroupSearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="max-h-56 overflow-y-auto py-1 text-xs sm:text-sm">
                                    {filteredGroups.length === 0 && (
                                        <div className="px-3 py-2 text-[11px] text-gray-500">
                                            No groups found.
                                        </div>
                                    )}
                                    {filteredGroups.map((g: any) => {
                                        const id = toStr(g._id);
                                        const checked = selectedGroupIds.includes(id);
                                        const alreadyShared = hasActiveGroupShareFor(id);
                                        return (
                                            <label
                                                key={id}
                                                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-gray-50"
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="h-3 w-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    checked={checked}
                                                    onChange={(e) => {
                                                        const next = e.target.checked
                                                            ? [...selectedGroupIds, id]
                                                            : selectedGroupIds.filter(
                                                                  (x) => x !== id
                                                              );
                                                        setSelectedGroupIds(next);
                                                    }}
                                                />
                                                <div className="flex flex-col">
                                                    <span className="truncate text-gray-900">
                                                        {g.name}
                                                    </span>
                                                    <span className="text-[11px] text-gray-500">
                                                        {alreadyShared
                                                            ? "Already has an active share"
                                                            : g.city || g.tags || "No extra info"}
                                                    </span>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {selectedGroupIds.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {selectedGroupIds.map((gid) => (
                                <span
                                    key={gid}
                                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px]"
                                >
                                    <Users className="h-3 w-3 text-gray-500" />
                                    <span className="truncate max-w-[8rem]">
                                        {groupNameById.get(gid) || gid}
                                    </span>
                                </span>
                            ))}
                        </div>
                    )}

                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleCreateGroupShare}
                        disabled={creating || !anySelectedGroupWithoutShare}
                        className="w-full justify-center gap-2 text-xs sm:text-sm"
                        leftIcon={<Share2 className="h-3.5 w-3.5" />}
                    >
                        {creating
                            ? "Creating group share…"
                            : anySelectedGroupWithoutShare
                              ? "Share with selected groups"
                              : "All selected groups already have shares"}
                    </Button>
                    <span className="text-[11px] text-gray-500">
                        Only groups without an active share will receive a new link.
                    </span>
                </div>
            )}

            {/* Drivers mode */}
            {createMode === "drivers" && !isLoadingShares && (
                <div className="mt-1 space-y-3">
                    {/* Existing driver shares as chips with delete */}
                    {driverIdsInShares.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {driverIdsInShares.map((uid) => {
                                const d = driversMap[uid];
                                const display = d?.name || d?.email || `User ${uid.slice(-6)}`;
                                const secondary = d?.email || "";

                                return (
                                    <span
                                        key={uid}
                                        className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] bg-white"
                                        title={secondary || uid}
                                    >
                                        <UserIcon className="w-3.5 h-3.5 text-gray-500" />
                                        <span className="font-medium text-gray-900 truncate max-w-[10rem]">
                                            {display}
                                        </span>
                                        {secondary && (
                                            <span className="text-gray-500 truncate max-w-[8rem]">
                                                • {secondary}
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            className="p-0.5 rounded hover:bg-gray-100"
                                            onClick={() => handleRemoveDriverFromShares(uid)}
                                            disabled={removingDriverId === uid || creating}
                                            aria-label={`Remove ${display}`}
                                        >
                                            {removingDriverId === uid ? (
                                                <span className="text-[10px] text-gray-500">
                                                    Removing…
                                                </span>
                                            ) : (
                                                <X className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </span>
                                );
                            })}
                        </div>
                    )}

                    {/* Add new driver shares via DriverCombobox */}
                    <DriverCombobox
                        id="quick-share-drivers"
                        mode="multi"
                        label="Share with drivers"
                        placeholder="Select drivers to share with"
                        values={driverValues}
                        onChange={setDriverValues}
                        actionLabel="Share with selected drivers"
                        actionHint="Creates a driver-only share for all selected drivers. Existing shares will be skipped."
                        actionDisabled={creating}
                        onAction={handleCreateDriverShare}
                        className="w-full"
                    />
                </div>
            )}

            {error && (
                <div className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700">
                    {error}
                </div>
            )}
        </div>
    );
}
