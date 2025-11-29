export type GroupType = "fleet" | "coop" | "airport" | "city" | "custom" | "global";
export type GroupVisibility = "public" | "private" | "restricted";

export const GROUP_VISIBILITY_OPTIONS: GroupVisibility[] = [
    "public",
    "private",
    "restricted",
];

export const GROUP_TYPE_OPTIONS: GroupType[] = [
    "fleet",
    "coop",
    "airport",
    "city",
    "custom",
    "global",
];

export interface Group {
    _id: string;
    name: string;
    type: GroupType;

    // ownership / membership
    ownerId: string;
    moderators: string[];
    participants: string[];

    // meta
    description?: string;
    city?: string;
    location?: string;
    visibility: GroupVisibility;
    isInviteOnly: boolean;
    tags?: string[];
    rules?: string;

    // optional aggregate stats your API may add
    isActive?: boolean;
    membersCount?: number;
    activeRides?: number;
    totalRides?: number;

    createdAt?: string;
    updatedAt?: string;
}

/* -------------------- create/update payloads -------------------- */

export interface CreateGroupRequest {
    name: string;
    description?: string;
    type?: GroupType;
    city?: string;
    location?: string;
    visibility?: GroupVisibility;
    isInviteOnly?: boolean;
    tags?: string[];
    rules?: string;
}

export type UpdateGroupRequest = Partial<CreateGroupRequest>;

/* -------------------------- membership -------------------------- */

export interface GroupMemberUser {
    _id: string;
    name?: string;
    email?: string;
}

export interface GroupParticipantsPayload {
    owner: GroupMemberUser | null;
    moderators: GroupMemberUser[];
    participants: GroupMemberUser[];
}

/* ---------------------------- invites --------------------------- */

export interface GroupInviteResponse {
    code: string;
    groupId: string;
    expiresAt?: string | null;
}

export interface JoinGroupResponse {
    ok: boolean;
    group: {
        _id: string;
        name: string;
        type: GroupType;
    };
}

/* -------------------------- dashboard --------------------------- */

export interface GroupDashboardRides {
    activeAssigned: any[];   // use your Ride type here if you want strict typing
    activeUnassigned: any[];
    history: any[];
}

export interface GroupDashboard {
    group: {
        _id: string;
        name: string;
        type: GroupType;
        city?: string;
        visibility: GroupVisibility;
        isInviteOnly: boolean;
        tags?: string[];
        rules?: string;
        ownerId: string;
    };
    drivers: any[];          // use your User type if you want strict typing
    rides: GroupDashboardRides;
    rideRequests: any[];     // RideClaim+details; keep as any for now
}

/* ----------------------- legacy activity ------------------------ */
/* keep for now so existing UI using it doesn’t break */

export interface GroupActivity {
    id: string;
    type: "join" | "ride" | "message" | "leave";
    user: string;
    group: string;
    time: string;
    description: string;
}
