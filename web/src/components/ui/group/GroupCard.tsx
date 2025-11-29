import {formatGroupType, Group, type GroupType} from "@/types";
import {Button, Card, CardBody} from "@/components/ui";
import Link from "next/link";
import {Activity, MapPin, Tag, Users, Lock} from "lucide-react";

export default function GroupCard({ group }: { group: Group }) {
    const membersCount = group.participants?.length ?? 0;

    const tags = Array.isArray(group.tags) ? group.tags : [];
    const shownTags = tags.slice(0, 3);
    const extraTags = tags.length - shownTags.length;

    const hasRidesStats =
        typeof group.activeRides === "number" ||
        typeof group.totalRides === "number";

    const rawActiveSharesCount =
        (group as any).activeSharesCount ??
        (Array.isArray((group as any).activeShares)
            ? (group as any).activeShares.length
            : undefined);

    const hasActiveShare =
        !!(group as any).hasActiveShare ||
        !!(group as any).hasActiveShares ||
        (typeof rawActiveSharesCount === "number" &&
            rawActiveSharesCount > 0);

    return (
        <Card className="h-full flex flex-col">
            <CardBody className="p-4 sm:p-5 flex flex-col gap-3">
                {/* Title + description + active share badge */}
                <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                        <Link
                            href={`/groups/${group._id}`}
                            className="text-sm sm:text-base font-semibold text-gray-900 hover:underline break-words"
                        >
                            {group.name}
                        </Link>
                        {group.description && (
                            <p className="text-xs sm:text-sm text-gray-500 line-clamp-2">
                                {group.description}
                            </p>
                        )}
                    </div>

                    {hasActiveShare && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                            <Activity className="h-3 w-3" />
                            <span>Ride shared</span>
                        </span>
                    )}
                </div>

                {/* Meta pills: type, city, visibility, invite-only */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs">
                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700 border border-indigo-100">
                        {formatGroupType(group.type)}
                    </span>

                    {group.city && (
                        <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-gray-600 border border-gray-100">
                            <MapPin className="h-3 w-3 mr-1" />
                            {group.city}
                        </span>
                    )}

                    {group.visibility && (
                        <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-gray-600 border border-gray-100">
                            {group.visibility}
                        </span>
                    )}

                    {group.isInviteOnly && (
                        <span className="inline-flex items-center rounded-full bg-gray-900 px-2 py-0.5 text-gray-100 border border-gray-900">
                            <Lock className="h-3 w-3 mr-1" />
                            invite-only
                        </span>
                    )}

                    {group.isActive !== undefined && (
                        <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 border ${
                                group.isActive
                                    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                                    : "border-gray-200 bg-gray-50 text-gray-500"
                            }`}
                        >
                            {group.isActive ? "Active" : "Inactive"}
                        </span>
                    )}
                </div>

                {/* Tags */}
                {tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs">
                        <span className="inline-flex items-center text-gray-500">
                            <Tag className="h-3 w-3 mr-1" />
                            Tags:
                        </span>
                        {shownTags.map((t) => (
                            <span
                                key={t}
                                className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-gray-700"
                            >
                                #{t}
                            </span>
                        ))}
                        {extraTags > 0 && (
                            <span className="text-gray-500">
                                +{extraTags} more
                            </span>
                        )}
                    </div>
                )}

                {/* Stats row */}
                <div className="mt-1 flex items-center justify-between text-[11px] sm:text-xs text-gray-500">
                    <div className="inline-flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        <span>{membersCount} members</span>
                    </div>

                    {hasRidesStats && (
                        <div className="inline-flex items-center gap-2">
                            {typeof group.activeRides === "number" && (
                                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 border border-amber-100">
                                    {group.activeRides} active
                                </span>
                            )}
                            {typeof group.totalRides === "number" && (
                                <span>{group.totalRides} total rides</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="pt-2 flex justify-end">
                    <Link href={`/groups/${group._id}`}>
                        <Button variant="outline" size="sm">
                            Open
                        </Button>
                    </Link>
                </div>
            </CardBody>
        </Card>
    );
}