// app/groups/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";

import {
    ArrowLeft,
    Trash2,
    Users,
    Shield,
    Edit3,
    X,
    Crown,
    Activity,
    LogOut,
} from "lucide-react";

import { useAuthStore } from "@/stores/auth";
import { dt } from "@/components/ui/commmon";

import {
    useGroup,
    useGroupDashboard,
    useGroupMembers,
    updateGroup,
    deleteGroup,
    leaveGroup,
    addGroupParticipant,
    removeGroupParticipant,
    addGroupModerator,
    removeGroupModerator,
} from "@/stores/groups";

import {
    DriverCombobox,
    type SimpleDriver,
} from "@/components/ui/ride/DriverCombobox";

import RideSummaryCard from "@/components/ui/ride/RideSummaryCard";

import type { GroupType } from "@/types/group";

export default function GroupDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuthStore();

    const {
        data: group,
        isLoading: groupLoading,
        mutate: mutateGroup,
    } = useGroup(id);

    const {
        data: members,
        isLoading: membersLoading,
        mutate: mutateMembers,
    } = useGroupMembers(id);

    const {
        data: dashboard,
        isLoading: dashboardLoading,
        mutate: mutateDashboard,
    } = useGroupDashboard(id);

    // meta editing: description, rules, tags
    const [isEditingMeta, setIsEditingMeta] = useState(false);
    const [meta, setMeta] = useState({
        description: "",
        rules: "",
        tags: "",
    });

    // participants add via driver combobox
    const [newParticipants, setNewParticipants] = useState<SimpleDriver[]>([]);
    const [savingMeta, setSavingMeta] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [leaving, setLeaving] = useState(false);

    useEffect(() => {
        if (!group) return;
        setMeta({
            description: group.description ?? "",
            rules: group.rules ?? "",
            tags: Array.isArray(group.tags) ? group.tags.join(", ") : "",
        });
    }, [group]);

    const userId = user?._id;
    const roles = user?.roles ?? [];
    const isAdmin = roles.includes("admin") || roles.includes("dispatcher");

    // role detection based on members payload (authoritative)
    const isOwner = useMemo(
        () => !!members && !!userId && members.owner?._id === userId,
        [members, userId],
    );

    const isModerator = useMemo(
        () =>
            !!members &&
            !!userId &&
            (members.moderators ?? []).some((m: any) => m._id === userId),
        [members, userId],
    );

    const isParticipant = useMemo(
        () =>
            !!members &&
            !!userId &&
            (members.participants ?? []).some((p: any) => p._id === userId),
        [members, userId],
    );

    const isMember = isOwner || isModerator || isParticipant;

    // high-level powers
    const canManage = !!group && (isAdmin || isOwner); // delete, manage moderators, transfer ownership
    const canModerate = !!group && (isAdmin || isOwner || isModerator); // edit meta, participants, invites

    // fine-grained capabilities
    const canManageModerators = canManage; // admin + owner
    const canManageParticipants = canModerate; // admin + owner + moderator

    const memberRoleLabel =
        isOwner ? "Owner" : isModerator ? "Moderator" : isParticipant ? "Participant" : undefined;

    const ownerUser = members?.owner || null;

    const moderatorsUsers = useMemo(() => {
        if (!members) return [];
        const ownerId = members.owner?._id;
        const mods = members.moderators ?? [];
        return mods.filter((m: any) => m._id !== ownerId);
    }, [members]);

    const participantsUsers = useMemo(() => {
        if (!members) return [];
        const ownerId = members.owner?._id;
        const moderatorIds = new Set((members.moderators ?? []).map((m: any) => m._id));
        return (members.participants ?? []).filter(
            (p: any) => p._id !== ownerId && !moderatorIds.has(p._id),
        );
    }, [members]);

    const membersCount = useMemo(() => {
        if (!group) return 0;
        if (Array.isArray(group.members) && group.members.length) return group.members.length;
        const base = 0 + (group.ownerId ? 1 : 0);
        return base + (group.moderators?.length ?? 0) + (group.participants?.length ?? 0);
    }, [group]);

    const shares: any[] = (dashboard as any)?.shares ?? [];

    const activeRides: any[] = useMemo(() => {
        if (!dashboard || !dashboard.rides) return [];
        const a = dashboard.rides.activeAssigned ?? [];
        const u = dashboard.rides.activeUnassigned ?? [];
        const all = [...a, ...u];
        return all.sort((r1: any, r2: any) => {
            const t1 = r1.datetime ? new Date(r1.datetime).getTime() : 0;
            const t2 = r2.datetime ? new Date(r2.datetime).getTime() : 0;
            return t1 - t2;
        });
    }, [dashboard]);

    const completedRides: any[] = useMemo(
        () => (dashboard?.rides?.history ?? []) as any[],
        [dashboard],
    );

    async function handleDeleteGroup() {
        if (!id || !group) return;
        const ok = window.confirm(
            "Delete this group? This cannot be undone and will remove shares from this group.",
        );
        if (!ok) return;

        try {
            setDeleting(true);
            await deleteGroup(id);
            router.push("/groups");
        } finally {
            setDeleting(false);
        }
    }

    async function handleLeaveGroup() {
        if (!id || !group || !isMember || isOwner) return;

        const ok = window.confirm("Leave this group?");
        if (!ok) return;

        try {
            setLeaving(true);
            await leaveGroup(id);
            router.push("/groups");
        } finally {
            setLeaving(false);
        }
    }

    async function handleSaveMeta() {
        if (!id || !group) return;

        setSavingMeta(true);
        try {
            const tags = meta.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean);

            await updateGroup(id, {
                description: meta.description.trim() || undefined,
                rules: meta.rules.trim() || undefined,
                tags: tags.length ? tags : [],
            });

            await Promise.all([mutateGroup(), mutateDashboard()]);
            setIsEditingMeta(false);
        } finally {
            setSavingMeta(false);
        }
    }

    async function handleAddParticipants(drivers: SimpleDriver[]) {
        if (!id || drivers.length === 0) return;
        await Promise.all(drivers.map((d) => addGroupParticipant(id, d.id)));
        setNewParticipants([]);
        await Promise.all([mutateMembers(), mutateGroup()]);
    }

    async function handleRemoveParticipant(userIdToRemove: string) {
        if (!id) return;
        await removeGroupParticipant(id, userIdToRemove);
        await Promise.all([mutateMembers(), mutateGroup()]);
    }

    async function handleAddModerator(userIdToPromote: string) {
        if (!id) return;
        await addGroupModerator(id, userIdToPromote);
        await Promise.all([mutateMembers(), mutateGroup()]);
    }

    async function handleRemoveModerator(userIdToDemote: string) {
        if (!id) return;
        await removeGroupModerator(id, userIdToDemote);
        await Promise.all([mutateMembers(), mutateGroup()]);
    }

    // Remove user completely from group (for owner/admin):
    //  - drop moderator role (if any)
    //  - drop participant membership
    async function handleRemoveMemberCompletely(userIdToRemove: string) {
        if (!id) return;
        try {
            await removeGroupModerator(id, userIdToRemove);
        } catch {
            // ignore if not moderator / no permission
        }
        try {
            await removeGroupParticipant(id, userIdToRemove);
        } catch {
            // ignore if not participant
        }
        await Promise.all([mutateMembers(), mutateGroup()]);
    }

    if (groupLoading && !group) {
        return (
            <ProtectedLayout>
                <Container className="px-3 sm:px-6 lg:px-8">
                    <div className="py-8 text-sm text-gray-600">Loading group…</div>
                </Container>
            </ProtectedLayout>
        );
    }

    if (!group) {
        return (
            <ProtectedLayout>
                <Container className="px-3 sm:px-6 lg:px-8">
                    <div className="py-8 text-sm text-gray-600">Group not found.</div>
                </Container>
            </ProtectedLayout>
        );
    }

    return (
        <ProtectedLayout>
            <Container className="px-3 sm:px-6 lg:px-8">
                <div className="space-y-4 sm:space-y-6 py-4 sm:py-6">
                    {/* Toolbar */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3 min-w-0">
                            <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<ArrowLeft className="w-4 h-4" />}
                                onClick={() => router.push("/groups")}
                            >
                                Back
                            </Button>

                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-200">
                                    <Users className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div className="min-w-0 space-y-1">
                                    <Typography className="text-xs text-gray-500">
                                        Group
                                    </Typography>
                                    <Typography
                                        variant="h1"
                                        className="text-base sm:text-2xl font-bold text-gray-900 break-words leading-tight"
                                    >
                                        {group.name}
                                    </Typography>

                                    <div className="flex flex-wrap gap-1.5 text-[11px] sm:text-xs">
                                        <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-indigo-700">
                                            {formatGroupType(group.type)}
                                        </span>
                                        {group.city && (
                                            <span className="inline-flex items-center rounded-full bg-gray-50 border border-gray-100 px-2 py-0.5 text-gray-700">
                                                {group.city}
                                            </span>
                                        )}
                                        {memberRoleLabel && (
                                            <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-emerald-700">
                                                <Shield className="w-3.5 h-3.5 mr-1" />
                                                {memberRoleLabel}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {canModerate && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<Edit3 className="w-4 h-4" />}
                                    onClick={() => setIsEditingMeta((prev) => !prev)}
                                >
                                    {isEditingMeta ? "Cancel edit" : "Edit details"}
                                </Button>
                            )}
                            {canManage && (
                                <Button
                                    variant="outline"
                                    colorScheme="error"
                                    size="sm"
                                    leftIcon={<Trash2 className="w-4 h-4" />}
                                    onClick={handleDeleteGroup}
                                    disabled={deleting}
                                >
                                    {deleting ? "Deleting…" : "Delete"}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Group meta: description, rules, tags, basic info */}
                    <Card variant="elevated">
                        <CardBody className="p-4 sm:p-6 space-y-4">
                            {/* Basic info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <div className="space-y-2">
                                    <MetaRow label="Name" value={group.name} />
                                    <MetaRow
                                        label="Type"
                                        value={formatGroupType(group.type)}
                                    />
                                    <MetaRow label="City" value={group.city || "—"} />
                                    <MetaRow
                                        label="Location"
                                        value={group.location || "—"}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <MetaRow
                                        label="Created"
                                        value={group.createdAt ? dt(group.createdAt) : "—"}
                                    />
                                    <MetaRow
                                        label="Updated"
                                        value={group.updatedAt ? dt(group.updatedAt) : "—"}
                                    />
                                    <MetaRow
                                        label="Members"
                                        value={membersCount ? String(membersCount) : "0"}
                                    />
                                    <MetaRow
                                        label="Visibility"
                                        value={`${group.visibility}${
                                            group.isInviteOnly ? " · invite only" : ""
                                        }`}
                                    />
                                </div>
                            </div>

                            {/* Editable details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-2 border-t border-gray-100">
                                {/* Description */}
                                <div className="space-y-2">
                                    <Typography className="text-sm font-semibold text-gray-900">
                                        Description
                                    </Typography>
                                    {isEditingMeta && canModerate ? (
                                        <textarea
                                            rows={4}
                                            value={meta.description}
                                            onChange={(e) =>
                                                setMeta((prev) => ({
                                                    ...prev,
                                                    description: e.target.value,
                                                }))
                                            }
                                            className={inputClass()}
                                            placeholder="Short description of what this group is for"
                                        />
                                    ) : (
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                            {group.description || "No description yet."}
                                        </p>
                                    )}
                                </div>

                                {/* Rules */}
                                <div className="space-y-2">
                                    <Typography className="text-sm font-semibold text-gray-900">
                                        Rules
                                    </Typography>
                                    {isEditingMeta && canModerate ? (
                                        <textarea
                                            rows={4}
                                            value={meta.rules}
                                            onChange={(e) =>
                                                setMeta((prev) => ({
                                                    ...prev,
                                                    rules: e.target.value,
                                                }))
                                            }
                                            className={inputClass()}
                                            placeholder="Add rules or guidelines for this group"
                                        />
                                    ) : (
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                            {group.rules || "No rules defined yet."}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="pt-2 border-t border-gray-100 space-y-2">
                                <Typography className="text-sm font-semibold text-gray-900">
                                    Tags
                                </Typography>
                                {isEditingMeta && canModerate ? (
                                    <input
                                        value={meta.tags}
                                        onChange={(e) =>
                                            setMeta((prev) => ({
                                                ...prev,
                                                tags: e.target.value,
                                            }))
                                        }
                                        className={inputClass()}
                                        placeholder="Comma-separated tags, e.g. airport, night, corporate"
                                    />
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {Array.isArray(group.tags) &&
                                        group.tags.length > 0 ? (
                                            group.tags.map((t: string) => (
                                                <span
                                                    key={t}
                                                    className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-700"
                                                >
                                                    #{t}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-sm text-gray-600">
                                                No tags.
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {isEditingMeta && canModerate && (
                                <div className="pt-3 flex flex-wrap gap-2">
                                    <Button
                                        size="sm"
                                        onClick={handleSaveMeta}
                                        disabled={savingMeta}
                                    >
                                        {savingMeta ? "Saving…" : "Save changes"}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            setIsEditingMeta(false);
                                            if (group) {
                                                setMeta({
                                                    description: group.description ?? "",
                                                    rules: group.rules ?? "",
                                                    tags: Array.isArray(group.tags)
                                                        ? group.tags.join(", ")
                                                        : "",
                                                });
                                            }
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    {/* Members + roles */}
                    <Card variant="elevated">
                        <CardBody className="p-4 sm:p-6 space-y-4">
                            <div className="flex items-center justify-between gap-2">
                                <Typography className="text-sm font-semibold text-gray-900">
                                    Members
                                </Typography>
                                <span className="text-xs text-gray-500">
                                    {membersCount} total
                                </span>
                            </div>

                            {/* Owner */}
                            <div className="space-y-2">
                                <Typography className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    Owner
                                </Typography>
                                <div className="flex flex-wrap gap-2">
                                    {ownerUser ? (
                                        <UserChip
                                            user={ownerUser}
                                            badge="Owner"
                                            badgeColor="indigo"
                                            link
                                            canRemove={false}
                                        />
                                    ) : (
                                        <span className="text-sm text-gray-600">
                                            No owner data loaded.
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Moderators */}
                            <div className="space-y-2">
                                <Typography className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    Moderators
                                </Typography>
                                <div className="flex flex-wrap gap-2">
                                    {moderatorsUsers.length === 0 && (
                                        <span className="text-sm text-gray-600">
                                            No moderators.
                                        </span>
                                    )}
                                    {moderatorsUsers.map((u: any) => (
                                        <UserChip
                                            key={u._id}
                                            user={u}
                                            badge="Moderator"
                                            badgeColor="emerald"
                                            link
                                            canRemove={
                                                canManageModerators &&
                                                u._id !== ownerUser?._id
                                            }
                                            onRemove={() =>
                                                handleRemoveMemberCompletely(u._id)
                                            }
                                            extraActions={
                                                canManageModerators &&
                                                u._id !== ownerUser?._id && (
                                                    <button
                                                        type="button"
                                                        className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:underline"
                                                        onClick={() =>
                                                            handleRemoveModerator(u._id)
                                                        }
                                                    >
                                                        Remove moderator role
                                                    </button>
                                                )
                                            }
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Participants */}
                            <div className="space-y-3">
                                <Typography className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    Participants
                                </Typography>

                                {/* Add participants (only moderators/owner/admin) */}
                                {canModerate && (
                                    <div className="max-w-xl">
                                        <DriverCombobox
                                            id="add-participants"
                                            mode="multi"
                                            label="Add participants"
                                            placeholder="Select drivers to add"
                                            values={newParticipants}
                                            onChange={setNewParticipants}
                                            actionLabel="Add selected to group"
                                            actionHint="Selected drivers will be added as participants."
                                            actionDisabled={groupLoading || membersLoading}
                                            onAction={handleAddParticipants}
                                        />
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2">
                                    {participantsUsers.length === 0 && (
                                        <span className="text-sm text-gray-600">
                                            No participants.
                                        </span>
                                    )}
                                    {participantsUsers.map((u: any) => (
                                        <UserChip
                                            key={u._id}
                                            user={u}
                                            link
                                            canRemove={
                                                canManageParticipants &&
                                                u._id !== ownerUser?._id
                                            }
                                            onRemove={() =>
                                                handleRemoveParticipant(u._id)
                                            }
                                            extraActions={
                                                canManageModerators &&
                                                u._id !== ownerUser?._id &&
                                                !moderatorsUsers.some(
                                                    (m: any) => m._id === u._id,
                                                ) && (
                                                    <button
                                                        type="button"
                                                        className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:underline"
                                                        onClick={() =>
                                                            handleAddModerator(u._id)
                                                        }
                                                    >
                                                        <Crown className="w-3 h-3" />
                                                        Make moderator
                                                    </button>
                                                )
                                            }
                                        />
                                    ))}
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Rides / activity + shares */}
                    {dashboard && (
                        <Card variant="elevated">
                            <CardBody className="p-4 sm:p-6 space-y-4">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-indigo-600" />
                                        <Typography className="text-sm font-semibold text-gray-900">
                                            Group rides
                                        </Typography>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        Drivers: {dashboard.drivers?.length ?? 0}
                                    </span>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                    <StatBox
                                        label="Active assigned"
                                        value={dashboard.rides.activeAssigned.length}
                                    />
                                    <StatBox
                                        label="Active unassigned"
                                        value={dashboard.rides.activeUnassigned.length}
                                    />
                                    <StatBox
                                        label="Completed"
                                        value={dashboard.rides.history.length}
                                    />
                                </div>

                                {/* Active rides with RideSummaryCard */}
                                {activeRides.length > 0 && (
                                    <div className="space-y-2 pt-2 border-t border-gray-100">
                                        <Typography className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                            Active rides
                                        </Typography>
                                        <div className="space-y-2">
                                            {activeRides.map((r: any) => (
                                                <RideSummaryCard
                                                    key={String(r._id)}
                                                    ride={r}
                                                    variant="accordion"
                                                    defaultExpanded={false}
                                                    detailsHref={`/rides/${r._id}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Completed rides with RideSummaryCard (recent) */}
                                {completedRides.length > 0 && (
                                    <div className="space-y-2 pt-2 border-t border-gray-100">
                                        <Typography className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                            Recent completed rides
                                        </Typography>
                                        <div className="space-y-2">
                                            {completedRides.slice(0, 5).map((r: any) => (
                                                <RideSummaryCard
                                                    key={String(r._id)}
                                                    ride={r}
                                                    variant="accordion"
                                                    defaultExpanded={false}
                                                    detailsHref={`/rides/${r._id}`}
                                                    hideActions={false}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Ride shares history with actions */}
                                {shares.length > 0 && (
                                    <div className="space-y-2 pt-2 border-t border-gray-100">
                                        <Typography className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                            Ride shares history
                                        </Typography>
                                        <div className="space-y-1.5">
                                            {shares.slice(0, 10).map((s: any) => {
                                                const ride = s.ride;
                                                const from = ride?.from
                                                    ? String(ride.from)
                                                    : "From ?";
                                                const to = ride?.to
                                                    ? String(ride.to)
                                                    : "To ?";
                                                const sharedBy =
                                                    s.sharedBy?.name ||
                                                    s.sharedBy?.email ||
                                                    (s.sharedBy
                                                        ? `User ${String(
                                                            s.sharedBy._id || s.sharedBy,
                                                        ).slice(-6)}`
                                                        : "Unknown");
                                                const sharedAt = s.createdAt
                                                    ? dt(s.createdAt)
                                                    : undefined;
                                                const isActiveShare =
                                                    s.status === "active";

                                                return (
                                                    <div
                                                        key={String(s._id)}
                                                        className="flex flex-col gap-1.5 rounded-md border border-gray-200 bg-white p-2 text-xs"
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="min-w-0">
                                                                <div className="text-gray-900 truncate">
                                                                    {from} → {to}
                                                                </div>
                                                                <div className="text-[11px] text-gray-500 truncate">
                                                                    Shared by {sharedBy}
                                                                    {sharedAt &&
                                                                        ` · ${sharedAt}`}
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 items-end sm:items-center">
                                                                <span
                                                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                                                                        isActiveShare
                                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                            : "bg-gray-50 text-gray-600 border-gray-200"
                                                                    }`}
                                                                >
                                                                    {s.status || "unknown"}
                                                                </span>
                                                                {ride && (
                                                                    <Button
                                                                        size="xs"
                                                                        variant="outline"
                                                                        onClick={() =>
                                                                            router.push(
                                                                                `/rides/${ride._id}`,
                                                                            )
                                                                        }
                                                                    >
                                                                        View ride
                                                                    </Button>
                                                                )}
                                                                {ride && isActiveShare && (
                                                                    <Button
                                                                        size="xs"
                                                                        onClick={() =>
                                                                            router.push(
                                                                                `/rides/${ride._id}`,
                                                                            )
                                                                        }
                                                                    >
                                                                        Request this ride
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    )}

                    {/* Membership actions – only show if there is something actionable */}
                    {(!isOwner || !isMember) && (
                        <Card>
                            <CardBody className="p-4 sm:p-5 space-y-3">
                                <Typography className="text-sm font-semibold text-gray-900">
                                    Membership
                                </Typography>
                                <div className="flex flex-wrap gap-2">
                                    {isMember && !isOwner && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            leftIcon={<LogOut className="w-4 h-4" />}
                                            onClick={handleLeaveGroup}
                                            disabled={leaving}
                                        >
                                            {leaving ? "Leaving…" : "Leave group"}
                                        </Button>
                                    )}
                                    {!isMember && (
                                        <span className="text-xs text-gray-600">
                                            This group is invite-only. Join with an invite link.
                                        </span>
                                    )}
                                </div>
                            </CardBody>
                        </Card>
                    )}
                </div>
            </Container>
        </ProtectedLayout>
    );
}

/* -------------------------------------------------------------------------- */
/* Small helpers                                                              */
/* -------------------------------------------------------------------------- */

function formatGroupType(t: GroupType | undefined): string {
    if (!t) return "Custom";
    switch (t) {
        case "fleet":
            return "Fleet";
        case "coop":
            return "Co-op";
        case "airport":
            return "Airport";
        case "city":
            return "City";
        case "custom":
            return "Custom";
        case "global":
            return "Global";
        default:
            return t;
    }
}

function inputClass() {
    return [
        "w-full rounded-lg border px-3 py-2.5 text-sm sm:text-base",
        "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
        "border-gray-300",
    ].join(" ");
}

function MetaRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-2 text-sm">
            <span className="text-gray-500">{label}</span>
            <span className="text-gray-900 text-right break-words">{value}</span>
        </div>
    );
}

function StatBox({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
            <div className="text-[11px] text-gray-500">{label}</div>
            <div className="text-sm font-semibold text-gray-900">{value}</div>
        </div>
    );
}

type UserChipProps = {
    user: { _id: string; name?: string; email?: string };
    badge?: string;
    badgeColor?: "indigo" | "emerald";
    link?: boolean;
    canRemove?: boolean;
    onRemove?: () => void;
    extraActions?: React.ReactNode;
};

function UserChip({
                      user,
                      badge,
                      badgeColor = "indigo",
                      link,
                      canRemove,
                      onRemove,
                      extraActions,
                  }: UserChipProps) {
    const displayName =
        user.name || user.email || `User ${user._id.slice(-6)}`;

    const badgeClass =
        badgeColor === "emerald"
            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
            : "bg-indigo-50 text-indigo-700 border-indigo-100";

    const content = (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-900 truncate max-w-[12rem]">
            {displayName}
        </span>
    );

    return (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs">
            <Users className="w-3.5 h-3.5 text-gray-500" />
            {link ? (
                <Link
                    href={`/users/${user._id}`}
                    className="hover:underline max-w-[12rem] truncate"
                >
                    {content}
                </Link>
            ) : (
                content
            )}
            {user.email && (
                <span className="text-[11px] text-gray-500 max-w-[10rem] truncate">
                    • {user.email}
                </span>
            )}
            {badge && (
                <span
                    className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] ${badgeClass}`}
                >
                    {badge}
                </span>
            )}
            {canRemove && onRemove && (
                <button
                    type="button"
                    className="p-0.5 rounded hover:bg-gray-100"
                    onClick={onRemove}
                    aria-label={`Remove ${displayName}`}
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            )}
            {extraActions}
        </div>
    );
}
