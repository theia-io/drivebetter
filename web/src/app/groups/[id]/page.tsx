// app/groups/[id]/page.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import { ArrowLeft, PencilLine, Trash2, Users, Plus, X, UserIcon } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { DriverCombobox, type SimpleDriver } from "@/components/ui/ride/DriverCombobox";
import { dt, KV } from "@/components/ui/commmon";

import {
    useGroup,
    deleteGroup as apiDeleteGroup,
    joinGroup as apiJoinGroup,
    leaveGroup as apiLeaveGroup,
    updateGroupMembers as apiUpdateGroupMembers,
} from "@/stores/groups";
import { useDriversPublicBatchMap } from "@/stores/users";

type MemberLike =
    | string
    | { _id?: string; id?: string; userId?: string; name?: string; email?: string };

export default function GroupDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuthStore();

    const { data: group, isLoading, mutate } = useGroup(id);

    // NEW: multi-select drivers via new DriverCombobox API
    const [selectedDrivers, setSelectedDrivers] = useState<SimpleDriver[]>([]);

    const canManage = user?.roles?.some((r) => r === "admin" || r === "dispatcher");

    const membersIds = useMemo(() => {
        return (group?.members ?? []) as MemberLike[];
    }, [group]);

    const { map: driversMap, isLoading: driversLoading } = useDriversPublicBatchMap(group?.members);

    const memberId = (m: MemberLike) =>
        typeof m === "string" ? m : m._id || m.userId || m.id || "";

    const memberLabel = (m: MemberLike) => {
        if (typeof m === "string") return `User ${m.slice(-6)}`;
        return m.name || m.email || `User ${String(memberId(m)).slice(-6)}`;
    };

    const isMember = useMemo(() => {
        if (!group || !user?._id) return false;
        return membersIds.some((m) => String(memberId(m)) === String(user._id));
    }, [group, membersIds, user]);

    async function onDelete() {
        if (!id) return;
        const ok = confirm("Delete this group?");
        if (!ok) return;
        const success = apiDeleteGroup(id);
        if (success) router.push("/groups");
    }

    async function onJoin() {
        if (!id) return;
        await apiJoinGroup(id);
        await mutate();
    }

    async function onLeave() {
        if (!id) return;
        await apiLeaveGroup(id);
        await mutate();
    }

    // NEW: add one or many selected drivers as members
    async function onAddMembers(drivers: SimpleDriver[]) {
        if (!id || drivers.length === 0) return;
        const addIds = drivers.map((d) => d.id);
        await apiUpdateGroupMembers(id, addIds, []);
        setSelectedDrivers([]);
        await mutate();
    }

    async function onRemoveMember(userId: string) {
        if (!id) return;
        await apiUpdateGroupMembers(id, [], [userId]);
        await mutate();
    }

    if (isLoading && !group) {
        return (
            <ProtectedLayout>
                <Container className="px-3 sm:px-6 lg:px-8">
                    <div className="py-8 text-sm text-gray-600">Loading…</div>
                </Container>
            </ProtectedLayout>
        );
    }

    if (!group) {
        return (
            <ProtectedLayout>
                <Container className="px-3 sm:px-6 lg:px-8">
                    <div className="py-8 text-sm text-gray-600">Not found</div>
                </Container>
            </ProtectedLayout>
        );
    }

    return (
        <ProtectedLayout>
            <Container className="px-3 sm:px-6 lg:px-8">
                <div className="space-y-4 sm:space-y-6">
                    {/* Toolbar */}
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<ArrowLeft className="w-4 h-4" />}
                                onClick={() => router.push("/groups")}
                            >
                                Back
                            </Button>
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-200">
                                    <Users className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div className="min-w-0">
                                    <Typography className="text-xs text-gray-500">Group</Typography>
                                    <Typography
                                        variant="h1"
                                        className="text-base sm:text-2xl font-bold text-gray-900 whitespace-normal break-words leading-tight"
                                    >
                                        {group.name}
                                    </Typography>
                                    {isMember && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-medium border bg-green-100 text-green-800 border-green-200">
                                            <span className="ml-1 capitalize">Group Member</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {canManage && (
                                <Link href={`/groups/${group._id}/edit`}>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        leftIcon={<PencilLine className="w-4 h-4" />}
                                    >
                                        Edit
                                    </Button>
                                </Link>
                            )}
                            {canManage && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<Trash2 className="w-4 h-4" />}
                                    onClick={onDelete}
                                >
                                    Delete
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Summary */}
                    <Card variant="elevated">
                        <CardBody className="p-4 sm:p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <div className="space-y-3">
                                    <KV k="Name" v={group.name} />
                                    <KV k="Type" v={group.type} />
                                    <KV k="City" v={group.city || "—"} />
                                    <KV k="Location" v={group.location || "—"} />
                                </div>
                                <div className="space-y-3">
                                    <KV k="Description" v={group.description || "—"} />
                                    <KV k="Created" v={dt(group.createdAt)} />
                                    <KV k="Updated" v={dt(group.updatedAt)} />
                                </div>
                                <div className="mt-4">
                                    <Typography className="text-sm font-semibold text-gray-900">
                                        Tags
                                    </Typography>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {Array.isArray(group.tags) && group.tags.length > 0 ? (
                                            group.tags.map((t: string) => (
                                                <span
                                                    key={t}
                                                    className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-700"
                                                    title={t}
                                                >
                                                    #{t}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-sm text-gray-600">No tags</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Join/Leave */}
                            <div className="mt-4 flex flex-wrap gap-2">
                                {!isMember ? (
                                    <Button size="sm" onClick={onJoin} disabled={isLoading}>
                                        Join Group
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onLeave}
                                        disabled={isLoading}
                                    >
                                        Leave Group
                                    </Button>
                                )}
                            </div>
                        </CardBody>
                    </Card>

                    {/* Members (add/remove) */}
                    {canManage && (
                        <Card variant="elevated">
                            <CardBody className="p-4 sm:p-6 space-y-4">
                                <Typography className="text-sm font-semibold text-gray-900">
                                    Members: {membersIds.length}
                                </Typography>

                                {/* Add members with new DriverCombobox (multi + action) */}
                                <div className="flex flex-col gap-3">
                                    <DriverCombobox
                                        id="add-drivers"
                                        mode="multi"
                                        label="Add members"
                                        placeholder="Select drivers to add"
                                        values={selectedDrivers}
                                        onChange={setSelectedDrivers}
                                        actionLabel="Add selected to group"
                                        actionHint="Selected drivers will be added as group members."
                                        actionDisabled={isLoading}
                                        onAction={onAddMembers}
                                    />
                                </div>

                                {/* Members list */}
                                <div className="flex flex-wrap gap-2">
                                    {membersIds.length === 0 && !driversLoading && (
                                        <div className="text-sm text-gray-600">No members yet.</div>
                                    )}

                                    {driversLoading && membersIds.length > 0 && (
                                        <div className="text-sm text-gray-600">
                                            Loading members…
                                        </div>
                                    )}

                                    {membersIds.map((m) => {
                                        const uid = String(
                                            typeof m === "string"
                                                ? m
                                                : m._id || m.userId || m.id || ""
                                        );
                                        const d = driversMap[uid];
                                        const displayName =
                                            (typeof m !== "string" && (m as any).name) ||
                                            d?.name ||
                                            memberLabel(m);
                                        const secondary =
                                            (typeof m !== "string" && (m as any).email) ||
                                            d?.email ||
                                            "";

                                        return (
                                            <span
                                                key={uid}
                                                className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs bg-white"
                                                title={secondary || uid}
                                            >
                                                <UserIcon className="w-3.5 h-3.5 text-gray-500" />
                                                <Link
                                                    href={`/users/${uid}`}
                                                    className="hover:underline font-medium text-gray-900 truncate max-w-[12rem]"
                                                >
                                                    {displayName}
                                                </Link>
                                                {secondary && (
                                                    <span className="text-gray-600 truncate max-w-[10rem]">
                                                        • {secondary}
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    className="p-0.5 rounded hover:bg-gray-100"
                                                    onClick={() => onRemoveMember(uid)}
                                                    aria-label={`Remove ${displayName}`}
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </span>
                                        );
                                    })}
                                </div>
                            </CardBody>
                        </Card>
                    )}
                </div>
            </Container>
        </ProtectedLayout>
    );
}
