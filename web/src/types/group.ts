export type GroupType = "fleet" | "coop" | "airport" | "city" | "custom";

export const GROUP_VISIBILITY_OPTIONS = ["public", "private", "restricted"];
export const GROUP_TYPE_OPTIONS = ["fleet", "coop", "airport", "city", "custom"];

export interface Group {
    _id: string;
    name: string;
    type: GroupType;
    members: string[];
    city?: string;
    isActive?: boolean;
    membersCount?: number;
    description?: string;
    activeRides?: number;
    totalRides?: number;
    rating?: number;
    location?: string;
    created?: string;
    visibility?: GroupVisibility;
    tags?: string[];
    isInviteOnly?: boolean;
    status?: "active" | "inactive";
    createdAt: string;
    updatedAt: string;
}

export type UpdateGroupRequest = Omit<Group, "_id" | "createdAt" | "updatedAt" | "isActive">;

export type GroupVisibility = "public" | "private" | "restricted";

export type CreateGroupRequest = {
    name: string;
    type: "fleet" | "coop" | "airport" | "city" | "custom";
    description?: string;
    city?: string;
    location?: string;
    visibility?: GroupVisibility; // default "private"
    isInviteOnly?: boolean; // default false
    tags?: string[];
};

export interface GroupActivity {
    id: string;
    type: "join" | "ride" | "message" | "leave";
    user: string;
    group: string;
    time: string;
    description: string;
}
