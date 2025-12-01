"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
    Share2,
    Copy,
    Link2,
    Users,
    UserIcon,
    ChevronDown,
    Search,
    Globe2,
} from "lucide-react";
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
import { UserChip } from "@/components/ui/general/UserChip";

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

export default function RideShareQuickPanel({
                                                rideId,
                                                className = "",
                                            }: RideShareQuickPanelProps) {
    const { data: shares = [], isLoading: isLoadingShares, mutate } = useRideShares(rideId);

    const { data: groupsData } = useGroups({});
    const groups = groupsData?.items ?? [];

    const activeShares = useMemo(
        () => shares.filter((s) => s.status === "active"),
        [shares],
    );

    const primary = useMemo(() => pickPrimary(shares), [shares]);
    const hasPrimary = !!primary;
    const url = hasPrimary ? ((primary as any).url as string | undefined) : undefined;
    const visibilityLabel = hasPrimary ? formatVisibility(primary!.visibility) : null;

    const publicShareExists = useMemo(
        () => activeShares.some((s) => s.visibility === "public"),
        [activeShares],
    );

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

    // "Shared with" accordion
    const [sharedDetailsOpen, setSharedDetailsOpen] = useState(false);

    // Group multi-select
    const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
    const [groupSearch, setGroupSearch] = useState("");
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

    // Drivers: existing driver-shares and “new drivers to share with”
    const driverShares = useMemo(
        () => activeShares.filter((s) => s.visibility === "drivers"),
        [activeShares],
    );

    const driverIdsInShares = useMemo(
        () =>
            Array.from(
                new Set(
                    driverShares.flatMap((s) =>
                        (s.driverIds || []).map((id) => toStr(id)),
                    ),
                ),
            ),
        [driverShares],
    );

    const { map: driversMap } = useDriversPublicBatchMap(driverIdsInShares);

    const [driverValues, setDriverValues] = useState<SimpleDriver[]>([]);
    const [removingDriverId, setRemovingDriverId] = useState<string | null>(null);

    const driverCount = driverIdsInShares.length;

    const groupNameById = useMemo(
        () => new Map(groups.map((g: any) => [toStr(g._id), g.name as string])),
        [groups],
    );

    const groupIdsInShares = useMemo(() => {
        const ids = new Set<string>();
        for (const s of activeShares) {
            if (s.visibility === "groups") {
                for (const gid of s.groupIds || []) {
                    ids.add(toStr(gid));
                }
            }
        }
        return Array.from(ids);
    }, [activeShares]);

    function hasActiveGroupShareFor(groupId: string): boolean {
        return activeShares.some(
            (s) =>
                s.visibility === "groups" &&
                s.status === "active" &&
                (s.groupIds || []).some((gid) => toStr(gid) === groupId),
        );
    }

    function hasActiveDriverShareFor(userId: string): boolean {
        return driverShares.some((s) =>
            (s.driverIds || []).some((uid) => toStr(uid) === userId),
        );
    }

    const filteredGroups = useMemo(() => {
        const q = groupSearch.trim().toLowerCase();
        return groups.filter((g: any) => {
            const id = toStr(g._id);
            if (hasActiveGroupShareFor(id)) return false;

            if (!q) return true;
            const name = String(g.name || "").toLowerCase();
            const city = String(g.city || "").toLowerCase();
            const tags = String(g.tags || "").toLowerCase();
            return name.includes(q) || city.includes(q) || tags.includes(q);
        });
    }, [groups, groupSearch, activeShares]);

    const anySelectedGroupWithoutShare = selectedGroupIds.some(
        (gid) => !hasActiveGroupShareFor(gid),
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

    async function handleRemoveDriverFromShares(userId: string) {
        setRemovingDriverId(userId);
        setError(null);
        try {
            const affected = driverShares.filter((s) =>
                (s.driverIds || []).some((uid) => toStr(uid) === userId),
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
                    }),
                );
            }

            if (ops.length) {
                await Promise.all(ops);
            }
        } catch (e: any) {
            setError(e?.message || "Failed to remove driver from share");
        } finally {
            setRemovingDriverId(null);
            await mutate();
        }
    }

    return (
        <div
            className={[
                "rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm",
                "flex flex-col gap-3",
                className,
            ].join(" ")}
        >
            {/* Header / status */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-3">
                <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50">
                        <Share2 className="h-4 w-4 text-indigo-600" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="font-medium text-gray-900 text-sm">
                                Share this ride
                            </div>
                            {totalActive > 0 && (
                                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                                    {totalActive} active share
                                    {totalActive > 1 ? "s" : ""}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-col gap-1 text-xs text-gray-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                            {isLoadingShares && <span>Loading shares…</span>}

                            {!isLoadingShares && totalActive > 0 && (
                                <>
                                    <span>
                                        Public {shareCounts.public} • Groups{" "}
                                        {shareCounts.groups} • Drivers {driverCount}
                                    </span>
                                    {hasPrimary && (
                                        <>
                                            <span className="hidden h-1 w-1 rounded-full bg-gray-300 sm:inline-block" />
                                            <span className="inline-flex items-center gap-1 truncate max-w-full sm:max-w-[12rem]">
                                                <Link2 className="h-3 w-3 shrink-0" />
                                                <span className="truncate">
                                                    {url || "No URL"}
                                                </span>
                                            </span>
                                            <span className="hidden h-1 w-1 rounded-full bg-gray-300 sm:inline-block" />
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
                </div>

                {/* Right-hand actions: stacked and full-width on mobile */}
                <div className="flex w-full flex-row gap-2 sm:w-auto sm:flex-col sm:items-end">
                    {hasPrimary && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopy}
                            disabled={!url}
                            className="flex-1 px-2 py-1 text-xs sm:w-auto"
                            leftIcon={<Copy className="h-3 w-3" />}
                        >
                            {copied ? "Copied" : "Copy"}
                        </Button>
                    )}
                    <Link href={`/rides/${rideId}/share`} className="flex-1 sm:w-auto">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full px-2 py-1 text-xs text-indigo-700 hover:text-indigo-800"
                        >
                            Manage
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Shared details accordion */}
            {totalActive > 0 && (
                <div className="mt-1">
                    <button
                        type="button"
                        onClick={() => setSharedDetailsOpen((v) => !v)}
                        className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700"
                    >
                        <span className="inline-flex items-center gap-1.5">
                            <Share2 className="h-3 w-3" />
                            Shared details
                        </span>
                        <ChevronDown
                            className={[
                                "h-3 w-3 transition-transform",
                                sharedDetailsOpen ? "rotate-180" : "",
                            ].join(" ")}
                        />
                    </button>
                    {sharedDetailsOpen && (
                        <div className="mt-2 space-y-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
                            {/* Public */}
                            <div className="flex items-start gap-2">
                                <Globe2 className="h-3.5 w-3.5 text-gray-500 mt-0.5" />
                                <div className="flex-1">
                                    <div className="text-xs font-semibold text-gray-800">
                                        Public
                                    </div>
                                    {publicShareExists ? (
                                        <div className="text-xs text-gray-600">
                                            Public share is active.
                                        </div>
                                    ) : (
                                        <div className="text-xs text-gray-400">
                                            No public share.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Groups */}
                            <div className="flex items-start gap-2">
                                <Users className="h-3.5 w-3.5 text-gray-500 mt-0.5" />
                                <div className="flex-1">
                                    <div className="text-xs font-semibold text-gray-800">
                                        Groups
                                    </div>
                                    {groupIdsInShares.length === 0 ? (
                                        <div className="text-xs text-gray-400">
                                            Not shared with any groups.
                                        </div>
                                    ) : (
                                        <div className="mt-1 space-y-1">
                                            {groupIdsInShares.map((gid) => (
                                                <div
                                                    key={gid}
                                                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-800"
                                                >
                                                    <Users className="h-3 w-3 text-gray-500" />
                                                    <span className="truncate max-w-full">
                                                        {groupNameById.get(gid) || gid}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Drivers */}
                            <div className="flex items-start gap-2">
                                <UserIcon className="h-3.5 w-3.5 text-gray-500 mt-0.5" />
                                <div className="flex-1">
                                    <div className="text-xs font-semibold text-gray-800">
                                        Drivers
                                    </div>
                                    {driverIdsInShares.length === 0 ? (
                                        <div className="text-xs text-gray-400">
                                            Not shared with any drivers.
                                        </div>
                                    ) : (
                                        <div className="mt-1 space-y-2">
                                            {driverIdsInShares.map((uid) => {
                                                const d = driversMap[uid];
                                                const user = {
                                                    _id: uid,
                                                    name: d?.name,
                                                    email: d?.email,
                                                };

                                                return (
                                                    <UserChip
                                                        key={uid}
                                                        user={user}
                                                        badge="Shared"
                                                        badgeColor="indigo"
                                                        canRemove
                                                        onRemove={() =>
                                                            handleRemoveDriverFromShares(uid)
                                                        }
                                                    />
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Tabs with icons (public / groups / drivers) */}
            {!isLoadingShares && (
                <div className="mt-1">
                    <ul className="flex w-full text-xs font-medium text-center text-gray-500 border-b border-gray-200">
                        <li className="flex-1">
                            <button
                                type="button"
                                onClick={() => setCreateMode("public")}
                                className={[
                                    "flex h-9 w-full items-center justify-center gap-1 rounded-t-lg border-b-2",
                                    createMode === "public"
                                        ? "text-indigo-600 border-indigo-600 bg-indigo-50/40"
                                        : "border-transparent hover:text-gray-700 hover:border-gray-300",
                                ].join(" ")}
                            >
                                <Globe2 className="w-3.5 h-3.5" />
                                <span>Public</span>
                            </button>
                        </li>
                        <li className="flex-1">
                            <button
                                type="button"
                                onClick={() => setCreateMode("group")}
                                className={[
                                    "flex h-9 w-full items-center justify-center gap-1 rounded-t-lg border-b-2",
                                    createMode === "group"
                                        ? "text-indigo-600 border-indigo-600 bg-indigo-50/40"
                                        : "border-transparent hover:text-gray-700 hover:border-gray-300",
                                ].join(" ")}
                            >
                                <Users className="w-3.5 h-3.5" />
                                <span>Groups</span>
                            </button>
                        </li>
                        <li className="flex-1">
                            <button
                                type="button"
                                onClick={() => setCreateMode("drivers")}
                                className={[
                                    "flex h-9 w-full items-center justify-center gap-1 rounded-t-lg border-b-2",
                                    createMode === "drivers"
                                        ? "text-indigo-600 border-indigo-600 bg-indigo-50/40"
                                        : "border-transparent hover:text-gray-700 hover:border-gray-300",
                                ].join(" ")}
                            >
                                <UserIcon className="w-3.5 h-3.5" />
                                <span>Drivers</span>
                            </button>
                        </li>
                    </ul>
                </div>
            )}

            {/* Public mode */}
            {createMode === "public" && !isLoadingShares && (
                <div className="mt-2 flex flex-col gap-1.5">
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
                    <span className="text-xs text-gray-500">
                        Creates a public link anyone with the URL can open.
                    </span>
                </div>
            )}

            {/* Group mode */}
            {createMode === "group" && !isLoadingShares && (
                <div className="mt-2 space-y-2">
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setGroupDropdownOpen((open) => !open)}
                            className="inline-flex w-full flex-col rounded-lg border border-gray-300 bg-white px-2 py-2 text-left text-xs sm:text-sm"
                        >
                            <span className="font-medium text-gray-800">
                                {selectedGroupIds.length > 0
                                    ? `${selectedGroupIds.length} group${selectedGroupIds.length > 1 ? "s" : ""} selected`
                                    : "Select groups"}
                            </span>
                            <span className="mt-0.5 text-[11px] text-gray-500">
                                Share with specific groups
                            </span>
                        </button>

                        {groupDropdownOpen && (
                            <div className="absolute z-40 mt-1 w-full rounded-lg border border-gray-100 bg-white shadow-lg">
                                {/* Search */}
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

                                {/* Group list (excluding already shared groups) */}
                                <div className="max-h-56 overflow-y-auto py-1 text-xs sm:text-sm">
                                    {filteredGroups.length === 0 && (
                                        <div className="px-3 py-2 text-xs text-gray-500">
                                            No groups available.
                                        </div>
                                    )}
                                    {filteredGroups.map((g: any) => {
                                        const id = toStr(g._id);
                                        const checked = selectedGroupIds.includes(id);
                                        return (
                                            <label
                                                key={id}
                                                className="flex cursor-pointer items-start gap-2 px-3 py-1.5 hover:bg-gray-50"
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="mt-1 h-3 w-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    checked={checked}
                                                    onChange={(e) => {
                                                        const next = e.target.checked
                                                            ? [...selectedGroupIds, id]
                                                            : selectedGroupIds.filter(
                                                                (x) => x !== id,
                                                            );
                                                        setSelectedGroupIds(next);
                                                    }}
                                                />
                                                <div className="flex flex-col">
                                                    <span className="truncate text-gray-900">
                                                        {g.name}
                                                    </span>
                                                    <span className="text-[11px] text-gray-500">
                                                        {g.city || g.tags || "No extra info"}
                                                    </span>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>

                                {/* Footer with action button inside dropdown */}
                                <div className="border-t border-gray-100 px-3 py-2">
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
                                </div>
                            </div>
                        )}
                    </div>

                    {selectedGroupIds.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {selectedGroupIds.map((gid) => (
                                <span
                                    key={gid}
                                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs"
                                >
                                    <Users className="h-3 w-3 text-gray-500" />
                                    <span className="truncate max-w-[10rem]">
                                        {groupNameById.get(gid) || gid}
                                    </span>
                                </span>
                            ))}
                        </div>
                    )}

                    <span className="text-xs text-gray-500">
                        Groups already shared with this ride are hidden from the list.
                    </span>
                </div>
            )}

            {/* Drivers mode */}
            {createMode === "drivers" && !isLoadingShares && (
                <div className="mt-2 space-y-3">
                    {/* Existing driver shares as chips */}
                    {driverIdsInShares.length > 0 && (
                        <div className="space-y-2">
                            {driverIdsInShares.map((uid) => {
                                const d = driversMap[uid];
                                const user = {
                                    _id: uid,
                                    name: d?.name,
                                    email: d?.email,
                                };

                                return (
                                    <UserChip
                                        key={uid}
                                        user={user}
                                        badge="Shared"
                                        badgeColor="indigo"
                                        canRemove
                                        onRemove={() => handleRemoveDriverFromShares(uid)}
                                    />
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
                        excludeIds={driverIdsInShares}
                        className="w-full"
                    />

                    <span className="text-xs text-gray-500">
                        Drivers already shared with this ride are hidden from the list.
                    </span>
                </div>
            )}

            {error && (
                <div className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                    {error}
                </div>
            )}
        </div>
    );
}
