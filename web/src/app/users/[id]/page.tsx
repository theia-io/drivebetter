"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import {
    ArrowLeft,
    PencilLine,
    Trash2,
    Users,
    CircleUser,
    Car,
    GaugeCircle,
    ChevronDown,
    ChevronRight,
    Settings,
    Languages,
    TagIcon,
    UsersIcon,
    MapPin,
    Globe,
    Lock,
} from "lucide-react";
import { useUser, deleteUser, useUserGroups } from "@/stores/users";
import { useDriverDetailsByUser } from "@/stores/driver-details";
import { arr, KV, num, Section, bool } from "@/components/ui/commmon";

const dt = (iso?: string) => (iso ? new Date(iso).toLocaleString() : "—");

export default function UserDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { data: user, isLoading, mutate } = useUser(id);

    const isDriver = useMemo(() => (user?.roles || []).includes("driver"), [user]);
    const { data: groups, isLoading: groupsLoading } = useUserGroups(id);

    const [showDriver, setShowDriver] = useState(false);
    const {
        data: dd,
        isLoading: ddLoading,
        mutate: mutateDD,
    } = useDriverDetailsByUser(showDriver && isDriver ? id : undefined);

    useEffect(() => {
        if (isDriver) setShowDriver(true);
    }, [isDriver]);

    async function onDelete() {
        const ok = confirm("Delete this user?");
        if (!ok) return;
        await deleteUser(id);
        router.push("/users");
    }

    return (
        <ProtectedLayout>
            <Container className="px-3 sm:px-4 lg:px-8 py-3 sm:py-4 lg:py-6">
                <div className="space-y-4 sm:space-y-6">
                    {/* Toolbar / header */}
                    <div className="flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 p-3 sm:p-4">
                        {/* Top row: back + actions (stack on mobile) */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<ArrowLeft className="w-4 h-4" />}
                                onClick={() => router.push("/users")}
                                className="order-1 w-full justify-center sm:order-none sm:w-auto"
                            >
                                Back to users
                            </Button>

                            <div className="flex flex-wrap items-center gap-2 order-3 w-full sm:order-none sm:w-auto sm:justify-end">
                                <Link href={`/users/${id}/edit`} className="flex-1 sm:flex-none">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        leftIcon={<PencilLine className="w-4 h-4" />}
                                        className="w-full sm:w-auto"
                                    >
                                        Edit
                                    </Button>
                                </Link>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<Trash2 className="w-4 h-4" />}
                                    onClick={onDelete}
                                    disabled={isLoading || !user}
                                    className="flex-1 sm:flex-none w-full sm:w-auto border-red-300 text-red-700 hover:bg-red-50"
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>

                        {/* User identity */}
                        <div className="mt-1 flex items-start gap-3 sm:gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 sm:h-12 sm:w-12">
                                <Users className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div className="min-w-0 space-y-1">
                                <Typography className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                                    User
                                </Typography>
                                <Typography
                                    as="h1"
                                    className="text-base sm:text-2xl font-semibold text-gray-900 leading-snug break-words"
                                >
                                    {isLoading ? "Loading…" : user?.name || "—"}
                                </Typography>
                                <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-600">
                                    {user?.email && (
                                        <span className="truncate">{user.email}</span>
                                    )}
                                    {user?.phone && (
                                        <>
                                            <span className="text-gray-400">•</span>
                                            <span className="truncate">{user.phone}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary card */}
                    <Card variant="elevated" className="rounded-2xl">
                        <CardBody className="p-4 sm:p-5">
                            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
                                <div className="space-y-3">
                                    <KV k="Name" v={user?.name} />
                                    <KV k="Email" v={user?.email} />
                                    <KV k="Phone" v={user?.phone || "—"} />
                                    <div>
                                        <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                            Roles
                                        </div>
                                        <div className="mt-1 flex flex-wrap gap-1.5">
                                            {(user?.roles || []).map((r) => (
                                                <span
                                                    key={r}
                                                    className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[11px] font-medium text-gray-700"
                                                >
                                                    {r}
                                                </span>
                                            ))}
                                            {!user?.roles?.length && (
                                                <span className="text-sm text-gray-600">—</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <KV k="Created" v={dt(user?.createdAt)} />
                                    <KV k="Updated" v={dt(user?.updatedAt)} />
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Groups */}
                    <Card variant="elevated" className="rounded-2xl">
                        <CardBody className="p-4 sm:p-5">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
                                        <UsersIcon className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <Typography className="text-sm font-semibold text-gray-900">
                                        Groups
                                    </Typography>
                                </div>
                                {groups && groups.length > 0 && (
                                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600">
                                        {groups.length} total
                                    </span>
                                )}
                            </div>

                            {groupsLoading ? (
                                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                                    Loading groups…
                                </div>
                            ) : !groups?.length ? (
                                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                                    This user is not a member of any groups.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
                                    {groups.map((g) => {
                                        const isPrivate =
                                            g.visibility === "private" || g.isInviteOnly;
                                        const memberCount =
                                            (g as any).members?.length ??
                                            (g as any).membersCount ??
                                            undefined;
                                        const membershipRole = (g as any)
                                            .membershipRole as
                                            | "owner"
                                            | "moderator"
                                            | "participant"
                                            | undefined;

                                        return (
                                            <div
                                                key={g._id}
                                                className="group flex flex-col rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm transition-shadow hover:shadow-md"
                                            >
                                                {/* Header */}
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <Link
                                                            href={`/groups/${g._id}`}
                                                            className="block truncate text-sm font-semibold text-gray-900 hover:text-indigo-700 hover:underline"
                                                            title={g.name}
                                                        >
                                                            {g.name}
                                                        </Link>
                                                        {membershipRole && (
                                                            <span
                                                                className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                                                    membershipRole === "owner"
                                                                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                                                        : membershipRole === "moderator"
                                                                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                                                                            : "bg-blue-50 text-blue-800 border border-blue-200"
                                                                }`}
                                                            >
                                                                {membershipRole === "owner"
                                                                    ? "Owner"
                                                                    : membershipRole === "moderator"
                                                                        ? "Moderator"
                                                                        : "Participant"}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span
                                                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                                                            isPrivate
                                                                ? "border-amber-200 bg-amber-50 text-amber-800"
                                                                : "border-green-200 bg-green-50 text-green-800"
                                                        }`}
                                                        title={
                                                            isPrivate
                                                                ? "Invite only / private"
                                                                : "Public"
                                                        }
                                                    >
                                                        {isPrivate ? (
                                                            <Lock className="h-3.5 w-3.5" />
                                                        ) : (
                                                            <Globe className="h-3.5 w-3.5" />
                                                        )}
                                                        {isPrivate ? "Private" : "Public"}
                                                    </span>
                                                </div>

                                                {/* Meta */}
                                                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
                                                    {(g.city || g.location) && (
                                                        <span className="inline-flex items-center gap-1">
                                                            <MapPin className="h-3.5 w-3.5 text-gray-400" />
                                                            <span className="truncate">
                                                                {g.city || g.location}
                                                            </span>
                                                        </span>
                                                    )}
                                                    {typeof memberCount === "number" && (
                                                        <span className="inline-flex items-center gap-1">
                                                            <UsersIcon className="h-3.5 w-3.5 text-gray-400" />
                                                            {memberCount}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Description */}
                                                {g.description && (
                                                    <p className="mt-2 line-clamp-2 text-xs text-gray-700">
                                                        {g.description}
                                                    </p>
                                                )}

                                                {/* Tags */}
                                                {!!g.tags?.length && (
                                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                                                            <TagIcon className="h-3.5 w-3.5" />
                                                            Tags:
                                                        </span>
                                                        {g.tags.slice(0, 6).map((t) => (
                                                            <span
                                                                key={t}
                                                                className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-700"
                                                            >
                                                                {t}
                                                            </span>
                                                        ))}
                                                        {g.tags.length > 6 && (
                                                            <span className="text-[11px] text-gray-500">
                                                                +{g.tags.length - 6} more
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    {/* Driver details */}
                    {isDriver && (
                        <Card variant="elevated" className="rounded-2xl">
                            <CardBody className="p-4 sm:p-5">
                                <button
                                    type="button"
                                    onClick={() => setShowDriver((v) => !v)}
                                    className="flex w-full items-center justify-between text-left"
                                >
                                    <div className="flex items-center gap-2">
                                        <CircleUser className="h-4 w-4 text-gray-600" />
                                        <Typography className="text-sm font-semibold text-gray-900">
                                            Driver details
                                        </Typography>
                                        <span className="text-xs text-gray-500">
                                            {ddLoading ? "Loading…" : dd ? "" : "(no profile yet)"}
                                        </span>
                                    </div>
                                    {showDriver ? (
                                        <ChevronDown className="h-4 w-4 text-gray-500" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-gray-500" />
                                    )}
                                </button>

                                {showDriver && (
                                    <div className="mt-4 space-y-4">
                                        {!dd && !ddLoading && (
                                            <div className="flex flex-col gap-3 rounded-xl border border-dashed border-gray-300 p-4 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="text-sm text-gray-700">
                                                    This user doesn’t have driver details yet.
                                                </div>
                                                <Link href={`/driver-details/by-user/${id}/edit`}>
                                                    <Button size="sm" className="w-full sm:w-auto">
                                                        Create driver profile
                                                    </Button>
                                                </Link>
                                            </div>
                                        )}

                                        {dd && (
                                            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
                                                <Section
                                                    title="Vehicle"
                                                    icon={<Car className="h-4 w-4" />}
                                                >
                                                    <KV k="Make" v={dd.vehicle?.make} />
                                                    <KV k="Model" v={dd.vehicle?.model} />
                                                    <KV k="Year" v={num(dd.vehicle?.year)} />
                                                    <KV k="Type" v={dd.vehicle?.type} />
                                                    <KV k="Plate" v={dd.vehicle?.plate} />
                                                </Section>

                                                <Section
                                                    title="Capacity"
                                                    icon={<GaugeCircle className="h-4 w-4" />}
                                                >
                                                    <KV
                                                        k="Seats"
                                                        v={num(dd.capacity?.seatsTotal)}
                                                    />
                                                    <KV
                                                        k="Max passengers"
                                                        v={num(dd.capacity?.maxPassengers)}
                                                    />
                                                    <KV
                                                        k="Luggage (L)"
                                                        v={num(dd.capacity?.luggageCapacity)}
                                                    />
                                                </Section>

                                                <Section
                                                    title="Features"
                                                    icon={<Settings className="h-4 w-4" />}
                                                >
                                                    <KV
                                                        k="Pet friendly"
                                                        v={bool(dd.features?.petFriendly)}
                                                    />
                                                    <KV
                                                        k="Baby seat"
                                                        v={bool(dd.features?.babySeat)}
                                                    />
                                                    <KV
                                                        k="Wheelchair"
                                                        v={bool(
                                                            dd.features?.wheelchairAccessible,
                                                        )}
                                                    />
                                                </Section>

                                                <Section
                                                    title="Languages"
                                                    icon={<Languages className="h-4 w-4" />}
                                                >
                                                    <KV
                                                        k="Primary"
                                                        v={dd.languages?.primary}
                                                    />
                                                    <KV k="Other" v={arr(dd.languages?.list)} />
                                                </Section>
                                            </div>
                                        )}

                                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                                            <Link
                                                href={`/driver-details/by-user/${id}`}
                                                className="sm:flex-1"
                                            >
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full"
                                                >
                                                    Open full profile
                                                </Button>
                                            </Link>
                                            <Link
                                                href={`/driver-details/by-user/${id}/edit`}
                                                className="sm:flex-1"
                                            >
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    leftIcon={<PencilLine className="h-4 w-4" />}
                                                    className="w-full"
                                                >
                                                    Edit
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => mutateDD()}
                                                className="w-full sm:w-auto"
                                            >
                                                Refresh
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    )}

                    {/* Bottom actions */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                        <Link href={`/rides?driverId=${id}`} className="sm:flex-1">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-center"
                                leftIcon={<Car className="h-4 w-4" />}
                            >
                                View driver’s rides
                            </Button>
                        </Link>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => mutate()}
                            className="w-full sm:w-auto"
                        >
                            Refresh user
                        </Button>
                    </div>
                </div>
            </Container>
        </ProtectedLayout>
    );
}
