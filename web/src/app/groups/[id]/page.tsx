// app/groups/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";

import {
    Activity,
    ArrowLeft,
    Crown,
    Edit3,
    Info,
    LogOut,
    Shield,
    Trash2,
    Users,
    X,
} from "lucide-react";

import { useAuthStore } from "@/stores/auth";
import { dt, inputClass } from "@/components/ui/commmon";

import {
    useGroup,
    useGroupDashboard,
    useGroupParticipants,
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
} from "@/components/ride/selectors/DriverCombobox";

import RideSummaryCard from "@/components/ride/cards/RideSummaryCard";
import SharedRideRequestCard from "@/components/ride/cards/SharedRideRequestCard";

import type { GroupType } from "@/types/group";
import {AccordionItem} from "@/components/ui/general/AccordionItem";
import {UserChip} from "@/components/ui/general/UserChip";

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
        data: participants,
        isLoading: participantsLoading,
        mutate: mutateParticipants,
    } = useGroupParticipants(id);

    const {
        data: dashboard,
        isLoading: dashboardLoading,
        mutate: mutateDashboard,
    } = useGroupDashboard(id);

    const [isEditingMeta, setIsEditingMeta] = useState(false);
    const [meta, setMeta] = useState<{
        name: string;
        city: string;
        type: GroupType | "" ;
        visibility: string;
        description: string;
        rules: string;
        tags: string;
    }>({
        name: "",
        city: "",
        type: "",
        visibility: "",
        description: "",
        rules: "",
        tags: "",
    });

    const [newParticipants, setNewParticipants] = useState<SimpleDriver[]>([]);
    const [savingMeta, setSavingMeta] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [leaving, setLeaving] = useState(false);

    useEffect(() => {
        if (!group) return;
        setMeta({
            name: group.name ?? "",
            city: group.city ?? "",
            type: (group.type as GroupType) ?? "",
            visibility: group.visibility ?? "",
            description: group.description ?? "",
            rules: group.rules ?? "",
            tags: Array.isArray(group.tags) ? group.tags.join(", ") : "",
        });
    }, [group]);

    const userId = user?._id;
    const roles = user?.roles ?? [];
    const isAdmin = roles.includes("admin") || roles.includes("dispatcher");

    const isOwner = useMemo(
        () => !!participants && !!userId && participants.owner?._id === userId,
        [participants, userId],
    );

    const isModerator = useMemo(
        () =>
            !!participants &&
            !!userId &&
            (participants.moderators ?? []).some((m: any) => m === userId),
        [participants, userId],
    );

    const isParticipant = useMemo(
        () =>
            !!participants &&
            !!userId &&
            (participants.participants ?? []).some((p: any) => p._id === userId),
        [participants, userId],
    );

    const isMember = isOwner || isModerator || isParticipant;

    const canManage = !!group && (isAdmin || isOwner);
    const canModerate = !!group && (isAdmin || isOwner || isModerator);
    const canManageModerators = canManage;
    const canManageParticipants = canModerate;

    const memberRoleLabel =
        isOwner ? "Owner" : isModerator ? "Moderator" : isParticipant ? "Participant" : undefined;

    const ownerUser = participants?.owner || null;

    const moderatorsUsers = useMemo(() => {
        if (!participants) return [];
        const ownerId = participants.owner?._id;
        const mods = participants.moderators ?? [];
        return mods.filter((m: any) => m._id !== ownerId);
    }, [participants]);

    const participantsUsers = useMemo(() => {
        if (!participants) return [];
        const ownerId = participants.owner?._id;
        const moderatorIds = new Set((participants.moderators ?? []).map((m: any) => m._id));
        return (participants.participants ?? []).filter(
            (p: any) => p._id !== ownerId && !moderatorIds.has(p._id),
        );
    }, [participants]);

    const existingMemberIds = useMemo(() => {
        const set = new Set<string>();
        if (ownerUser?._id) set.add(ownerUser._id);
        moderatorsUsers.forEach((u: any) => set.add(u._id));
        participantsUsers.forEach((u: any) => set.add(u._id));
        return set;
    }, [ownerUser, moderatorsUsers, participantsUsers]);

    useEffect(() => {
        if (!participants) return;
        setNewParticipants((prev) =>
            prev.filter((d) => !existingMemberIds.has(d.id)),
        );
    }, [participants, existingMemberIds]);

    const membersCount = useMemo(() => {
        if (!group) return 0;
        if (Array.isArray(group.participants) && group.participants.length)
            return group.participants.length;
        const base = 0 + (group.ownerId ? 1 : 0);
        return base + (group.moderators?.length ?? 0) + (group.participants?.length ?? 0);
    }, [group]);

    const shares: any[] = (dashboard as any)?.shares ?? [];
    const rideRequests: any[] = (dashboard as any)?.rideRequests ?? [];
    const driversForDashboard: any[] = (dashboard as any)?.drivers ?? [];

    const driverMap = useMemo(() => {
        const m: Record<string, any> = {};
        driversForDashboard.forEach((d: any) => {
            m[String(d._id)] = d;
        });
        return m;
    }, [driversForDashboard]);

    const activeShares = useMemo(
        () => shares.filter((s) => s.status === "active"),
        [shares],
    );
    const historicalShares = useMemo(
        () => shares.filter((s) => s.status !== "active"),
        [shares],
    );

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
                name: meta.name.trim() || group.name,
                city: meta.city.trim() || undefined,
                type: (meta.type || group.type) as GroupType,
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

        const uniqueToAdd = drivers.filter((d) => !existingMemberIds.has(d.id));
        if (uniqueToAdd.length === 0) {
            setNewParticipants([]);
            return;
        }

        await Promise.all(uniqueToAdd.map((d) => addGroupParticipant(id, d.id)));
        setNewParticipants([]);
        await Promise.all([mutateParticipants(), mutateGroup()]);
    }

    async function handleRemoveParticipant(userIdToRemove: string) {
        if (!id) return;
        await removeGroupParticipant(id, userIdToRemove);
        await Promise.all([mutateParticipants(), mutateGroup()]);
    }

    async function handleAddModerator(userIdToPromote: string) {
        if (!id) return;
        await addGroupModerator(id, userIdToPromote);
        await Promise.all([mutateParticipants(), mutateGroup()]);
    }

    async function handleRemoveModerator(userIdToDemote: string) {
        if (!id) return;
        await removeGroupModerator(id, userIdToDemote);
        await Promise.all([mutateParticipants(), mutateGroup()]);
    }

    async function handleRemoveMemberCompletely(userIdToRemove: string) {
        if (!id) return;
        try {
            await removeGroupModerator(id, userIdToRemove);
        } catch {}
        try {
            await removeGroupParticipant(id, userIdToRemove);
        } catch {}
        await Promise.all([mutateParticipants(), mutateGroup()]);
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

    const groupTypeOptions: { value: GroupType; label: string }[] = [
        { value: "fleet", label: "Fleet" },
        { value: "coop", label: "Co-op" },
        { value: "airport", label: "Airport" },
        { value: "city", label: "City" },
        { value: "custom", label: "Custom" },
        { value: "global", label: "Global" },
    ];

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

                    {/* Flowbite-style accordion wrapper */}
                    <div id="accordion-group-details" className="space-y-3">
                        {/* Group details accordion item */}
                        <AccordionItem
                            id="group-details"
                            title="Group details"
                            defaultOpen
                            icon={<Info className="w-4 h-4 text-indigo-600" />}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                {/* Left column: editable name/type/city, location readonly */}
                                {isEditingMeta && canModerate ? (
                                    <div className="space-y-3">
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-medium text-gray-600">
                                                Name
                                            </label>
                                            <input
                                                className={inputClass()}
                                                value={meta.name}
                                                onChange={(e) =>
                                                    setMeta((prev) => ({
                                                        ...prev,
                                                        name: e.target.value,
                                                    }))
                                                }
                                                placeholder="Group name"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-medium text-gray-600">
                                                Type
                                            </label>
                                            <select
                                                className={inputClass()}
                                                value={meta.type || ""}
                                                onChange={(e) =>
                                                    setMeta((prev) => ({
                                                        ...prev,
                                                        type: e.target
                                                            .value as GroupType | "",
                                                    }))
                                                }
                                            >
                                                <option value="">
                                                    Select type
                                                </option>
                                                {groupTypeOptions.map((opt) => (
                                                    <option
                                                        key={opt.value}
                                                        value={opt.value}
                                                    >
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-medium text-gray-600">
                                                City
                                            </label>
                                            <input
                                                className={inputClass()}
                                                value={meta.city}
                                                onChange={(e) =>
                                                    setMeta((prev) => ({
                                                        ...prev,
                                                        city: e.target.value,
                                                    }))
                                                }
                                                placeholder="City"
                                            />
                                        </div>
                                        <MetaRow
                                            label="Location"
                                            value={group.location || "—"}
                                        />
                                    </div>
                                ) : (
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
                                )}

                                {/* Right column: created/updated/members + editable visibility */}
                                {isEditingMeta && canModerate ? (
                                    <div className="space-y-3">
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
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-medium text-gray-600">
                                                Visibility
                                            </label>
                                            <input
                                                className={inputClass()}
                                                value={meta.visibility}
                                                onChange={(e) =>
                                                    setMeta((prev) => ({
                                                        ...prev,
                                                        visibility: e.target.value,
                                                    }))
                                                }
                                                placeholder="Visibility, e.g. public / private"
                                            />
                                        </div>
                                    </div>
                                ) : (
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
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-3 border-t border-gray-100">
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

                            <div className="pt-3 border-t border-gray-100 space-y-2">
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
                                                    name: group.name ?? "",
                                                    city: group.city ?? "",
                                                    type: (group.type as GroupType) ?? "",
                                                    visibility: group.visibility ?? "",
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
                        </AccordionItem>

                        {/* Members accordion item */}
                        <AccordionItem
                            id="group-members"
                            title={`Members (${membersCount})`}
                            icon={<Users className="w-4 h-4 text-indigo-600" />}
                            defaultOpen
                        >
                            <div className="space-y-4">
                                {/* Owner */}
                                <div className="space-y-2">
                                    <Typography className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        Owner
                                    </Typography>
                                    <div className="flex flex-col gap-2">
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
                                    <div className="flex flex-col gap-2">
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
                                                            Remove moderator
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

                                    {canModerate && (
                                        <div className="max-w-xl">
                                            <DriverCombobox
                                                id="add-participants"
                                                mode="multi"
                                                label="Add participants"
                                                placeholder="Select drivers to add"
                                                values={newParticipants}
                                                onChange={(drivers) =>
                                                    setNewParticipants(
                                                        drivers.filter((d) => !existingMemberIds.has(d.id)),
                                                    )
                                                }
                                                excludeIds={Array.from(existingMemberIds)}
                                                actionLabel="Add selected"
                                                actionHint="Existing members are ignored."
                                                actionDisabled={groupLoading || participantsLoading}
                                                onAction={handleAddParticipants}
                                            />
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-2">
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
                            </div>
                        </AccordionItem>

                        {/* Rides / activity accordion item */}
                        {dashboard && (
                            <AccordionItem
                                id="group-rides"
                                title="Group rides & shares"
                                icon={<Activity className="w-4 h-4 text-indigo-600" />}
                                defaultOpen
                            >
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                        <Typography className="text-sm font-semibold text-gray-900">
                                            Group rides
                                        </Typography>
                                        <span className="text-xs text-gray-500">
                                            Drivers: {dashboard.drivers?.length ?? 0}
                                        </span>
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                                        <StatBox
                                            label="Active assigned"
                                            value={
                                                dashboard.rides?.activeAssigned?.length ??
                                                0
                                            }
                                        />
                                        <StatBox
                                            label="Active unassigned"
                                            value={
                                                dashboard.rides?.activeUnassigned
                                                    ?.length ?? 0
                                            }
                                        />
                                        <StatBox
                                            label="Completed"
                                            value={
                                                dashboard.rides?.history?.length ?? 0
                                            }
                                        />
                                    </div>

                                    {/* Active shared rides – uses SharedRideRequestCard */}
                                    {activeShares.length > 0 && (
                                        <SectionBlock
                                            title="Active shared rides"
                                            count={activeShares.length}
                                        >
                                            <div className="space-y-2">
                                                {activeShares.map((s: any) => {
                                                    const ride = s.ride || {};

                                                    // this driver's latest claim for this ride
                                                    const myClaimForShare = userId
                                                        ? rideRequests
                                                            .filter((r: any) => {
                                                                const sameRide =
                                                                    String(r.rideId) ===
                                                                    String(
                                                                        s.rideId ?? ride._id,
                                                                    );
                                                                const sameDriver =
                                                                    String(r.driverId) ===
                                                                    String(userId);
                                                                return sameRide && sameDriver;
                                                            })
                                                            .sort(
                                                                (a: any, b: any) =>
                                                                    new Date(
                                                                        a.createdAt,
                                                                    ).getTime() -
                                                                    new Date(
                                                                        b.createdAt,
                                                                    ).getTime(),
                                                            )
                                                            .at(-1)
                                                        : null;

                                                    const item = {
                                                        ride: {
                                                            _id: String(
                                                                ride._id || s.rideId,
                                                            ),
                                                            from: String(
                                                                ride.from ?? "",
                                                            ),
                                                            to: String(ride.to ?? ""),
                                                            datetime:
                                                                ride.datetime ||
                                                                ride.dateTime ||
                                                                ride.when ||
                                                                s.createdAt,
                                                        },
                                                        shareId: String(s._id),
                                                        visibility: s.visibility,
                                                        maxClaims: s.maxClaims,
                                                        expiresAt: s.expiresAt,
                                                        myClaim: myClaimForShare
                                                            ? {
                                                                status: myClaimForShare.status,
                                                                createdAt:
                                                                myClaimForShare.createdAt,
                                                            }
                                                            : undefined,
                                                    };

                                                    return (
                                                        <SharedRideRequestCard
                                                            key={String(s._id)}
                                                            item={item as any}
                                                            context="available"
                                                            onAfterRequest={async () => {
                                                                await mutateDashboard();
                                                            }}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </SectionBlock>
                                    )}

                                    {/* Active rides */}
                                    {activeRides.length > 0 && (
                                        <SectionBlock
                                            title="Active rides"
                                            count={activeRides.length}
                                        >
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
                                        </SectionBlock>
                                    )}

                                    {/* Completed rides */}
                                    {completedRides.length > 0 && (
                                        <SectionBlock
                                            title="Recent completed rides"
                                            count={Math.min(
                                                5,
                                                completedRides.length,
                                            )}
                                        >
                                            <div className="space-y-2">
                                                {completedRides
                                                    .slice(0, 5)
                                                    .map((r: any) => (
                                                        <RideSummaryCard
                                                            key={String(r._id)}
                                                            ride={r}
                                                            variant="accordion"
                                                            defaultExpanded={false}
                                                            detailsHref={`/rides/${r._id}`}
                                                        />
                                                    ))}
                                            </div>
                                        </SectionBlock>
                                    )}

                                    {/* Share history – compact list */}
                                    {historicalShares.length > 0 && (
                                        <SectionBlock
                                            title="Ride share history"
                                            count={historicalShares.length}
                                        >
                                            <div className="space-y-1.5">
                                                {historicalShares
                                                    .slice(0, 20)
                                                    .map((s: any) =>
                                                        renderShareRow({
                                                            share: s,
                                                            router,
                                                            groupId: String(
                                                                group._id,
                                                            ),
                                                            driverMap,
                                                            rideRequests,
                                                            showRequestButton: false,
                                                        }),
                                                    )}
                                            </div>
                                        </SectionBlock>
                                    )}
                                </div>
                            </AccordionItem>
                        )}
                    </div>

                    {/* Membership actions */}
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
                                            This group is invite-only. Join with an
                                            invite link.
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
/* Helpers                                                                    */
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

type SectionBlockProps = {
    title: string;
    count?: number;
    children: React.ReactNode;
};

function SectionBlock({ title, count, children }: SectionBlockProps) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-600">
                <span className="font-medium">{title}</span>
                {typeof count === "number" && (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700">
                        {count}
                    </span>
                )}
            </div>
            {children}
        </div>
    );
}

type ShareRowParams = {
    share: any;
    router: ReturnType<typeof useRouter>;
    groupId: string;
    driverMap: Record<string, any>;
    rideRequests: any[];
    showRequestButton: boolean;
};

function renderShareRow({
                            share,
                            router,
                            groupId,
                            driverMap,
                            rideRequests,
                            showRequestButton,
                        }: ShareRowParams) {
    const s = share;
    const ride = s.ride;
    const from = ride?.from ? String(ride.from) : "From ?";
    const to = ride?.to ? String(ride.to) : "To ?";
    const sharedBy =
        s.sharedBy?.name ||
        s.sharedBy?.email ||
        (s.sharedBy
            ? `User ${String(s.sharedBy._id || s.sharedBy).slice(-6)}`
            : "Unknown");
    const sharedAt = s.createdAt ? dt(s.createdAt) : undefined;
    const isActiveShare = s.status === "active";

    const requestsForRide = rideRequests.filter(
        (r: any) => String(r.rideId) === String(s.rideId),
    );
    const lastRequest = requestsForRide.length
        ? requestsForRide[requestsForRide.length - 1]
        : null;
    const lastRequestDriver =
        lastRequest && lastRequest.driverId
            ? driverMap[String(lastRequest.driverId)]
            : null;

    const requestedByText =
        lastRequest && lastRequestDriver
            ? `Requested by ${
                lastRequestDriver.name ||
                lastRequestDriver.email ||
                `Driver ${String(lastRequestDriver._id).slice(-6)}`
            } · ${dt(lastRequest.createdAt)}`
            : lastRequest
                ? `Requested · ${dt(lastRequest.createdAt)}`
                : "No requests yet";

    return (
        <div
            key={String(s._id)}
            className="rounded-md border border-gray-200 bg-white p-2.5 text-xs space-y-1.5"
        >
            <div className="flex flex-col gap-1">
                <div className="text-gray-900 truncate">
                    {from} → {to}
                </div>
                <div className="text-[11px] text-gray-500">
                    Shared by {sharedBy}
                    {sharedAt && ` · ${sharedAt}`}
                </div>
                <div className="text-[11px] text-gray-500">
                    {requestedByText}
                    {requestsForRide.length > 1 &&
                        ` · ${requestsForRide.length} requests`}
                </div>
            </div>
            <div className="mt-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                        isActiveShare
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-gray-50 text-gray-600 border-gray-200"
                    }`}
                >
                    {s.status || "unknown"}
                </span>
                <div className="flex flex-wrap gap-1.5 sm:justify-end">
                    {ride && (
                        <Button
                            size="xs"
                            variant="outline"
                            onClick={() => router.push(`/rides/${ride._id}`)}
                        >
                            View
                        </Button>
                    )}
                    {ride && isActiveShare && showRequestButton && (
                        <Button
                            size="xs"
                            onClick={() =>
                                router.push(
                                    `/rides/${ride._id}?fromGroup=${groupId}&shareId=${s._id}`,
                                )
                            }
                        >
                            Request
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
