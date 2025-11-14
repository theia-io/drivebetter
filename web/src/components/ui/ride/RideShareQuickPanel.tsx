"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Share2, Copy, Link2 } from "lucide-react";
import { Button } from "@/components/ui";
import {
    useRideShares,
    createRideShare,
    type RideShare,
    type RideShareVisibility,
} from "@/stores/rideShares";
import { useGroups } from "@/stores/groups";

type RideShareQuickPanelProps = {
    rideId: string;
    className?: string;
};

type CreateMode = "public" | "group";

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
        isLoading,
        mutate,
    } = useRideShares(rideId);

    const { data: groupsData } = useGroups({});
    const groups = groupsData?.items ?? [];

    const activeShares = useMemo(
        () => shares.filter((s) => s.status === "active"),
        [shares],
    );

    const primary = useMemo(() => pickPrimary(shares), [shares]);
    const hasPrimary = !!primary;

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

    const [creating, setCreating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [createMode, setCreateMode] = useState<CreateMode>("public");
    const [selectedGroupId, setSelectedGroupId] = useState<string>("");

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

    function hasActiveGroupShareFor(gid: string): boolean {
        return activeShares.some(
            (s) =>
                s.visibility === "groups" &&
                (s.groupIds || []).map(toStr).includes(gid),
        );
    }

    async function handleCreateGroup() {
        if (!selectedGroupId) return;
        if (hasActiveGroupShareFor(selectedGroupId)) return;

        setCreating(true);
        setError(null);
        try {
            const payload = {
                visibility: "groups" as RideShareVisibility,
                groupIds: [selectedGroupId],
                driverIds: undefined,
                expiresAt: null,
                maxClaims: undefined,
                syncQueue: true,
            };
            await createRideShare(rideId, payload);
            await mutate();
        } catch (e: any) {
            setError(e?.message || "Failed to create group share");
        } finally {
            setCreating(false);
        }
    }

    async function handleCopy() {
        if (!primary) return;
        const url = (primary as any).url as string | undefined;
        if (!url) return;

        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // ignore
        }
    }

    const url = hasPrimary
        ? ((primary as any).url as string | undefined)
        : undefined;
    const visibilityLabel = hasPrimary
        ? formatVisibility(primary!.visibility)
        : null;

    const totalActive = activeShares.length;

    return (
        <div
            className={[
                "rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs sm:text-sm",
                "flex flex-col gap-2",
                className,
            ].join(" ")}
        >
            {/* Header + existing state */}
            <div className="flex items-start gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 mt-0.5">
                    <Share2 className="h-4 w-4 text-indigo-600" />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
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
                        {isLoading && <span>Loading shares…</span>}

                        {!isLoading && totalActive > 0 && (
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
                                    </>
                                )}
                            </>
                        )}

                        {!isLoading && totalActive === 0 && (
                            <span>No active shares yet.</span>
                        )}
                    </div>
                </div>

                {/* Right actions: copy + manage */}
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

            {/* Creation controls */}
            {!isLoading && (
                <div className="mt-1 space-y-2">
                    {/* Mode toggle */}
                    <div className="inline-flex rounded-full bg-gray-50 p-0.5 text-[11px]">
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
                            Group
                        </button>
                    </div>

                    {/* Public create */}
                    {createMode === "public" && (
                        <div className="flex flex-col gap-1">
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

                    {/* Group create */}
                    {createMode === "group" && (
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-col sm:flex-row gap-2">
                                <select
                                    value={selectedGroupId}
                                    onChange={(e) => setSelectedGroupId(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="">Select group…</option>
                                    {groups.map((g: any) => (
                                        <option key={toStr(g._id)} value={toStr(g._id)}>
                                            {g.name}
                                        </option>
                                    ))}
                                </select>

                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={handleCreateGroup}
                                    disabled={
                                        creating ||
                                        !selectedGroupId ||
                                        hasActiveGroupShareFor(selectedGroupId)
                                    }
                                    className="w-full sm:w-auto justify-center px-3 py-1.5 text-xs sm:text-sm"
                                    leftIcon={<Share2 className="h-3.5 w-3.5" />}
                                >
                                    {creating
                                        ? "Creating group share…"
                                        : "Share to group"}
                                </Button>
                            </div>

                            {selectedGroupId && hasActiveGroupShareFor(selectedGroupId) && (
                                <span className="text-[11px] text-gray-500">
                  This group already has an active share.
                </span>
                            )}

                            {!groups.length && (
                                <span className="text-[11px] text-gray-500">
                  No groups available. Create groups first to share to them.
                </span>
                            )}
                        </div>
                    )}
                </div>
            )}

            {error && (
                <div className="mt-1 text-[11px] text-red-600">
                    {error}
                </div>
            )}
        </div>
    );
}
