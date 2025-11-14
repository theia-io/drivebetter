// components/ui/ride/RideShareQuickPanel.tsx
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
} from "lucide-react";
import { Button } from "@/components/ui";
import {
    useRideShares,
    createRideShare,
    type RideShare,
    type RideShareVisibility,
} from "@/stores/rideShares";
import { useGroups } from "@/stores/groups";
import { useDriversPublic, type DriverPublic } from "@/stores/users";

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
    return (
        src.find((s) => s.visibility === "public") ||
        src[0] ||
        null
    );
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
    const {
        data: shares = [],
        isLoading: isLoadingShares,
        mutate,
    } = useRideShares(rideId);

    const { data: groupsData } = useGroups({});
    const groups = groupsData?.items ?? [];

    const { data: driversData, isLoading: driversLoading } = useDriversPublic();
    const drivers = (driversData as DriverPublic[]) ?? [];

    const activeShares = useMemo(
        () => shares.filter((s) => s.status === "active"),
        [shares],
    );

    const primary = useMemo(() => pickPrimary(shares), [shares]);
    const hasPrimary = !!primary;
    const url = hasPrimary
        ? ((primary as any).url as string | undefined)
        : undefined;
    const visibilityLabel = hasPrimary
        ? formatVisibility(primary!.visibility)
        : null;

    const publicShareExists = useMemo(
        () => activeShares.some((s) => s.visibility === "public"),
        [activeShares],
    );

    const shareCounts = useMemo(() => {
        const res = { public: 0, groups: 0, drivers: 0 };
        for (const s of activeShares) {
            if (s.visibility === "public") res.public += 1;
            if (s.visibility === "groups") res.groups += 1;
            if (s.visibility === "drivers") res.drivers += 1;
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

    // Driver multi-select
    const [driverDropdownOpen, setDriverDropdownOpen] = useState(false);
    const [driverSearch, setDriverSearch] = useState("");
    const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);

    const groupNameById = useMemo(
        () => new Map(groups.map((g: any) => [toStr(g._id), g.name as string])),
        [groups],
    );

    const driversById = useMemo(
        () => new Map(drivers.map((d) => [toStr(d._id), d])),
        [drivers],
    );

    const filteredGroups = useMemo(() => {
        const q = groupSearch.trim().toLowerCase();
        if (!q) return groups;
        return groups.filter((g: any) => {
            const name = String(g.name || "").toLowerCase();
            const city = String(g.city || "").toLowerCase();
            const tags = String(g.tags || "").toLowerCase();
            return (
                name.includes(q) ||
                city.includes(q) ||
                tags.includes(q)
            );
        });
    }, [groups, groupSearch]);

    const filteredDrivers = useMemo(() => {
        const q = driverSearch.trim().toLowerCase();
        if (!q) return drivers;
        return drivers.filter((d) => {
            const name = (d.name || "").toLowerCase();
            const email = (d.email || "").toLowerCase();
            return name.includes(q) || email.includes(q);
        });
    }, [drivers, driverSearch]);

    const selectedDrivers = useMemo(
        () =>
            selectedDriverIds
                .map((id) => {
                    const d = driversById.get(id);
                    if (!d) return null;
                    return {
                        id,
                        name: d.name,
                        email: d.email,
                    };
                })
                .filter(Boolean) as { id: string; name?: string; email?: string }[],
        [selectedDriverIds, driversById],
    );

    function hasActiveGroupShareFor(groupId: string): boolean {
        return activeShares.some(
            (s) =>
                s.visibility === "groups" &&
                s.status === "active" &&
                (s.groupIds || []).some((gid) => toStr(gid) === groupId),
        );
    }

    function hasActiveDriverShareFor(userId: string): boolean {
        return activeShares.some(
            (s) =>
                s.visibility === "drivers" &&
                s.status === "active" &&
                (s.driverIds || []).some((uid) => toStr(uid) === userId),
        );
    }

    const anySelectedGroupWithoutShare = selectedGroupIds.some(
        (gid) => !hasActiveGroupShareFor(gid),
    );

    const anySelectedDriver = selectedDriverIds.length > 0;

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

    async function handleCreateDriverShare() {
        if (!selectedDriverIds.length) return;

        setCreating(true);
        setError(null);
        try {
            const payload = {
                visibility: "drivers" as RideShareVisibility,
                groupIds: undefined,
                driverIds: selectedDriverIds,
                expiresAt: null,
                maxClaims: undefined,
                syncQueue: true,
            };
            await createRideShare(rideId, payload);
            await mutate();
            setSelectedDriverIds([]);
            setDriverDropdownOpen(false);
        } catch (e: any) {
            setError(e?.message || "Failed to create drivers share");
        } finally {
            setCreating(false);
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
                        <div className="font-medium text-gray-900">
                            Share this ride
                        </div>
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
                                    Drivers {shareCounts.drivers}
                                </span>
                                {hasPrimary && (
                                    <>
                                        <span className="h-1 w-1 rounded-full bg-gray-300" />
                                        <span className="inline-flex items-center gap-1 truncate max-w-[12rem]">
                                            <Link2 className="h-3 w-3 shrink-0" />
                                            <span className="truncate">
                                                {url || "No URL"}
                                            </span>
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
                                                            : selectedGroupIds.filter((x) => x !== id);
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
                <div className="mt-1 space-y-2">
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setDriverDropdownOpen((open) => !open)}
                            className="inline-flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-left text-xs sm:text-sm"
                        >
                            <span className="flex flex-col">
                                <span className="font-medium text-gray-800">
                                    {selectedDriverIds.length > 0
                                        ? `${selectedDriverIds.length} driver${selectedDriverIds.length > 1 ? "s" : ""} selected`
                                        : "Select drivers"}
                                </span>
                                <span className="text-[11px] text-gray-500">
                                    {selectedDriverIds.length > 0
                                        ? "You can select multiple drivers"
                                        : "Share with specific drivers"}
                                </span>
                            </span>
                            <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                        </button>

                        {driverDropdownOpen && (
                            <div className="absolute z-40 mt-1 w-full rounded-lg border border-gray-100 bg-white shadow-lg">
                                <div className="border-b border-gray-100 p-2">
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            className="w-full rounded-md border border-gray-200 bg-gray-50 pl-7 pr-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            placeholder="Search drivers…"
                                            value={driverSearch}
                                            onChange={(e) => setDriverSearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="max-h-56 overflow-y-auto py-1 text-xs sm:text-sm">
                                    {driversLoading && (
                                        <div className="px-3 py-2 text-[11px] text-gray-500">
                                            Loading drivers…
                                        </div>
                                    )}
                                    {!driversLoading && filteredDrivers.length === 0 && (
                                        <div className="px-3 py-2 text-[11px] text-gray-500">
                                            No drivers found.
                                        </div>
                                    )}
                                    {!driversLoading &&
                                        filteredDrivers.map((d) => {
                                            const id = toStr(d._id);
                                            const checked = selectedDriverIds.includes(id);
                                            const alreadyShared = hasActiveDriverShareFor(id);
                                            const secondary =
                                                d.email ||
                                                (alreadyShared ? "Already has an active share" : "");
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
                                                                ? [...selectedDriverIds, id]
                                                                : selectedDriverIds.filter((x) => x !== id);
                                                            setSelectedDriverIds(next);
                                                        }}
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="truncate text-gray-900">
                                                            {d.name || d.email || `User ${id.slice(-6)}`}
                                                        </span>
                                                        {secondary && (
                                                            <span className="text-[11px] text-gray-500">
                                                                {secondary}
                                                            </span>
                                                        )}
                                                    </div>
                                                </label>
                                            );
                                        })}
                                </div>
                            </div>
                        )}
                    </div>

                    {selectedDrivers.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {selectedDrivers.map((d) => (
                                <span
                                    key={d.id}
                                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px]"
                                >
                                    <UserIcon className="h-3 w-3 text-gray-500" />
                                    <span className="truncate max-w-[8rem]">
                                        {d.name || d.email || `User ${d.id.slice(-6)}`}
                                    </span>
                                </span>
                            ))}
                        </div>
                    )}

                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleCreateDriverShare}
                        disabled={creating || !anySelectedDriver}
                        className="w-full justify-center gap-2 text-xs sm:text-sm"
                        leftIcon={<Share2 className="h-3.5 w-3.5" />}
                    >
                        {creating
                            ? "Creating driver share…"
                            : anySelectedDriver
                                ? "Share with selected drivers"
                                : "Select drivers to share with"}
                    </Button>
                    <span className="text-[11px] text-gray-500">
                        Creates a driver-only share. Only selected drivers will see this ride in their inbox.
                    </span>
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
