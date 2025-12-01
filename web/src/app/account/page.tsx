"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Car, Users, Star, Award, ListChecks, Loader2 } from "lucide-react";

import ProtectedLayout from "@/components/ProtectedLayout";
import ProfileCard from "@/components/profile-card/profile-card";
import InstallPrompt from "./components/install";
import Preferences from "./components/preferences";
import ProfileInformation from "./components/profile-information";

import { useAuthStore } from "@/stores/auth";
import {
    useMyStats,
    useMyAchievements,
    useUserGroups,
    type Achievement, UserStatsGroups,
} from "@/stores/users";
import {
    useMyAssignedRideStats,
    type MyAssignedRideStats,
} from "@/stores/rides";

function StatsNumber({ value }: { value: number | null | undefined }) {
    if (value === null || value === undefined) {
        return <span className="text-gray-400">—</span>;
    }
    return <span>{value}</span>;
}

function LoadingBadge() {
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
      <Loader2 className="h-3 w-3 animate-spin" />
      Loading
    </span>
    );
}

function RidesOverviewCard({
                               stats,
                               loading,
                           }: {
    stats: ReturnType<typeof useMyStats>["data"];
    loading: boolean;
}) {
    return (
        <div className="h-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                        <Car className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900">Rides overview</h2>
                        <p className="text-xs text-gray-500">Created, assigned, completed</p>
                    </div>
                </div>
                {loading && <LoadingBadge />}
            </div>
            <dl className="grid grid-cols-3 gap-3 text-xs sm:text-sm">
                <div className="flex flex-col gap-1">
                    <dt className="text-[11px] uppercase tracking-wide text-gray-500">
                        Created
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                        <StatsNumber value={stats?.rides.createdTotal} />
                    </dd>
                </div>
                <div className="flex flex-col gap-1">
                    <dt className="text-[11px] uppercase tracking-wide text-gray-500">
                        Assigned
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                        <StatsNumber value={stats?.rides.assignedTotal} />
                    </dd>
                </div>
                <div className="flex flex-col gap-1">
                    <dt className="text-[11px] uppercase tracking-wide text-gray-500">
                        Completed
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                        <StatsNumber value={stats?.rides.completedTotal} />
                    </dd>
                </div>
            </dl>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <Link
                    href="/rides?scope=my-created"
                    className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                    My created rides
                </Link>
                <Link
                    href="/my-rides"
                    className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                    My assigned rides
                </Link>
            </div>
        </div>
    );
}

function AssignedRidesBreakdownCard({
                                        stats,
                                        loading,
                                    }: {
    stats: MyAssignedRideStats | undefined;
    loading: boolean;
}) {
    const rows = useMemo(() => {
        if (!stats?.byStatus) return [];
        return Object.entries(stats.byStatus)
            .filter(([, count]) => typeof count === "number" && count > 0)
            .map(([status, count]) => ({ status, count: count as number }))
            .sort((a, b) => b.count - a.count);
    }, [stats]);

    return (
        <div className="h-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
                        <ListChecks className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900">
                            Assigned rides by status
                        </h2>
                        <p className="text-xs text-gray-500">All-time summary</p>
                    </div>
                </div>
                {loading && <LoadingBadge />}
            </div>
            {rows.length === 0 ? (
                <p className="text-xs text-gray-500">No assigned rides yet.</p>
            ) : (
                <ul className="space-y-1.5 text-xs sm:text-sm">
                    {rows.map((row) => (
                        <li
                            key={row.status}
                            className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5"
                        >
              <span className="capitalize text-gray-700">
                {row.status.replace(/_/g, " ")}
              </span>
                            <span className="font-medium text-gray-900">{row.count}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function GroupsCard({
                        total,
                        owner,
                        moderator,
                        participant,
                        loading,
                    }: {
    total: number | undefined;
    owner: number | undefined;
    moderator: number | undefined;
    participant: number | undefined;
    loading: boolean;
}) {
    return (
        <div className="h-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                        <Users className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900">Groups</h2>
                        <p className="text-xs text-gray-500">Membership and roles</p>
                    </div>
                </div>
                {loading && <LoadingBadge />}
            </div>

            <dl className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="flex flex-col gap-1">
                    <dt className="text-[11px] uppercase tracking-wide text-gray-500">
                        Total
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                        <StatsNumber value={total} />
                    </dd>
                </div>
                <div className="flex flex-col gap-1">
                    <dt className="text-[11px] uppercase tracking-wide text-gray-500">
                        Owner
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                        <StatsNumber value={owner} />
                    </dd>
                </div>
                <div className="flex flex-col gap-1">
                    <dt className="text-[11px] uppercase tracking-wide text-gray-500">
                        Moderator
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                        <StatsNumber value={moderator} />
                    </dd>
                </div>
                <div className="flex flex-col gap-1">
                    <dt className="text-[11px] uppercase tracking-wide text-gray-500">
                        Participant
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                        <StatsNumber value={participant} />
                    </dd>
                </div>
            </dl>

            <div className="mt-4">
                <Link
                    href="/groups?scope=my"
                    className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                    View my groups
                </Link>
            </div>
        </div>
    );
}

function DriverCard({
                        ratingAvg,
                        ratingCount,
                        completedRides,
                        cancellations,
                        loading,
                    }: {
    ratingAvg: number | null | undefined;
    ratingCount: number | undefined;
    completedRides: number | undefined;
    cancellations: number | undefined;
    loading: boolean;
}) {
    const hasDriver = ratingAvg !== null && ratingAvg !== undefined;

    return (
        <div className="h-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                        <Star className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900">Driver profile</h2>
                        <p className="text-xs text-gray-500">Rating and ride history</p>
                    </div>
                </div>
                {loading && <LoadingBadge />}
            </div>

            {hasDriver ? (
                <>
                    <div className="mb-3 flex items-end gap-2">
                        <div className="flex items-center gap-1">
              <span className="text-2xl font-semibold text-gray-900">
                {ratingAvg?.toFixed(1)}
              </span>
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        </div>
                        <span className="text-xs text-gray-500">
              based on <StatsNumber value={ratingCount} /> reviews
            </span>
                    </div>
                    <dl className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                        <div className="flex flex-col gap-1">
                            <dt className="text-[11px] uppercase tracking-wide text-gray-500">
                                Completed rides
                            </dt>
                            <dd className="text-lg font-semibold text-gray-900">
                                <StatsNumber value={completedRides} />
                            </dd>
                        </div>
                        <div className="flex flex-col gap-1">
                            <dt className="text-[11px] uppercase tracking-wide text-gray-500">
                                Cancellations
                            </dt>
                            <dd className="text-lg font-semibold text-gray-900">
                                <StatsNumber value={cancellations} />
                            </dd>
                        </div>
                    </dl>
                    <div className="mt-4">
                        <Link
                            href="/drivers/me"
                            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                            View driver details
                        </Link>
                    </div>
                </>
            ) : (
                <p className="text-xs text-gray-500">
                    You do not have a driver profile yet.
                </p>
            )}
        </div>
    );
}

function AchievementsSection({
                                 achievements,
                                 loading,
                             }: {
    achievements: Achievement[] | undefined;
    loading: boolean;
}) {
    return (
        <section className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
                        <Award className="h-4 w-4 text-violet-600" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900">Achievements</h2>
                        <p className="text-xs text-gray-500">Progress unlocked from your activity</p>
                    </div>
                </div>
                {loading && <LoadingBadge />}
            </div>

            {loading && !achievements && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="h-14 animate-pulse rounded-xl bg-gray-100" />
                    <div className="h-14 animate-pulse rounded-xl bg-gray-100" />
                </div>
            )}

            {!loading && (!achievements || achievements.length === 0) && (
                <p className="text-xs text-gray-500">No achievements yet.</p>
            )}

            {achievements && achievements.length > 0 && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {achievements.map((a) => {
                        const unlocked = a.unlocked;
                        const pct = Math.round((a.progress ?? 0) * 100);

                        return (
                            <div
                                key={a.id}
                                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs sm:text-sm ${
                                    unlocked
                                        ? "border-emerald-200 bg-emerald-50"
                                        : "border-gray-200 bg-white"
                                }`}
                            >
                                <div className="min-w-0">
                                    <p
                                        className={`truncate font-semibold ${
                                            unlocked ? "text-emerald-800" : "text-gray-900"
                                        }`}
                                    >
                                        {a.title}
                                    </p>
                                    <p className="mt-0.5 line-clamp-2 text-[11px] text-gray-500">
                                        {a.description}
                                    </p>
                                </div>
                                <div className="ml-3 flex flex-col items-end">
                  <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          unlocked
                              ? "bg-emerald-600 text-white"
                              : "bg-gray-100 text-gray-600"
                      }`}
                  >
                    {unlocked ? "Unlocked" : `${pct}%`}
                  </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

export default function AccountPage() {
    const { user } = useAuthStore();

    const {
        data: stats,
        isLoading: loadingStats,
    } = useMyStats();
    const {
        data: achievements,
        isLoading: loadingAchievements,
    } = useMyAchievements();
    const {
        data: groupsWithRoles,
        isLoading: loadingUserGroups,
    } = useUserGroups(user?._id);
    const {
        data: assignedStats,
        isLoading: loadingAssignedStats,
    } = useMyAssignedRideStats();

    const groupsFromStats = stats?.groups;
    const groupsTotalsFromRoles = useMemo(() => {
        if (!groupsWithRoles || groupsWithRoles.length === 0) {
            return null;
        }

        let owner = 0;
        let moderator = 0;
        let participant = 0;

        for (const g of groupsWithRoles) {
            if (g.membershipRole === "owner") owner += 1;
            else if (g.membershipRole === "moderator") moderator += 1;
            else participant += 1;
        }

        return {
            owner,
            moderator,
            participant,
            total: owner + moderator + participant,
        };
    }, [groupsWithRoles]);

    const groupsCardSource = groupsTotalsFromRoles ?? groupsFromStats ?? undefined;

    return (
        <ProtectedLayout>
            <div className="w-full bg-gray-50">
                <div className="mx-auto flex max-w-5xl flex-col gap-4 px-3 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
                    {/* Header + profile */}
                    <header className="space-y-3 rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 p-4 sm:p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <h1 className="whitespace-nowrap text-xl font-semibold leading-tight text-gray-900 sm:text-2xl">
                                    Account
                                </h1>
                                <p className="mt-1 text-sm text-gray-600">
                                    Overview of your profile, rides, groups, and achievements.
                                </p>
                            </div>
                            {user && (
                                <Link
                                    href={`/users/${user._id}/edit`}
                                    className="inline-flex items-center justify-center rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs font-medium text-sky-800 shadow-sm hover:bg-sky-50 sm:text-sm"
                                >
                                    Edit profile
                                </Link>
                            )}
                        </div>
                        <div className="mt-3">
                            <ProfileCard user={user} />
                        </div>
                    </header>

                    {/* Install prompt */}
                    <InstallPrompt className="rounded-2xl border border-dashed border-gray-200 bg-white p-3 sm:p-4" />

                    {/* Main dashboard cards */}
                    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <RidesOverviewCard stats={stats} loading={loadingStats} />
                        <AssignedRidesBreakdownCard
                            stats={assignedStats}
                            loading={loadingAssignedStats}
                        />
                        <GroupsCard
                            total={groupsCardSource?.total}
                            owner={(groupsCardSource as UserStatsGroups)?.ownerTotal}
                            moderator={(groupsCardSource as UserStatsGroups)?.moderatorTotal}
                            participant={(groupsCardSource as UserStatsGroups)?.participantTotal}
                            loading={loadingUserGroups || loadingStats}
                        />
                        <DriverCard
                            ratingAvg={stats?.driver?.ratingAvg ?? null}
                            ratingCount={stats?.driver?.ratingCount}
                            completedRides={stats?.driver?.completedRides}
                            cancellations={stats?.driver?.cancellations}
                            loading={loadingStats}
                        />
                    </section>

                    {/* Achievements */}
                    <AchievementsSection
                        achievements={achievements}
                        loading={loadingAchievements}
                    />

                    {/* Details and preferences */}
                    <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                            <h2 className="mb-3 text-sm font-semibold text-gray-900">
                                Profile information
                            </h2>
                            <ProfileInformation user={user} />
                        </div>
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                                <h2 className="mb-3 text-sm font-semibold text-gray-900">
                                    Preferences
                                </h2>
                                <Preferences />
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </ProtectedLayout>
    );
}
