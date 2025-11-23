// web/ui/src/services/groups.ts
import useSWR from "swr";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/services/http";
import type {
    Group,
    CreateGroupRequest,
    UpdateGroupRequest,
    GroupDashboard,
    GroupMembersPayload,
    GroupInviteResponse,
    JoinGroupResponse,
    GroupActivity,
} from "@/types/group";
import type { PageResp } from "@/types";

/* ------------------------------ Helpers ------------------------------ */

const qs = (params?: Record<string, any>) => {
    if (!params) return "";
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") return;
        sp.set(k, String(v));
    });
    const s = sp.toString();
    return s ? `?${s}` : "";
};

/* ------------------------------ Types -------------------------------- */

export interface ListGroupsParams {
    q?: string;
    type?: Group["type"];
    city?: string;
    visibility?: "public" | "private" | "restricted";
    isInviteOnly?: boolean;
    page?: number;
    limit?: number;
}

/* ------------------------------ REST calls --------------------------- */

// list
export async function listGroups(params?: ListGroupsParams) {
    return apiGet<PageResp<Group>>(`/groups${qs(params)}`);
}

// get single
export async function getGroup(id: string) {
    return apiGet<Group>(`/groups/${id}`);
}

// create
export async function createGroup(body: CreateGroupRequest) {
    return apiPost<Group, CreateGroupRequest>("/groups", body);
}

// update
export async function updateGroup(id: string, body: UpdateGroupRequest) {
    return apiPatch<Group, UpdateGroupRequest>(`/groups/${id}`, body);
}

// delete
export async function deleteGroup(id: string) {
    return apiDelete<void>(`/groups/${id}`);
}

/* ----------------------- membership / roles -------------------------- */

export async function getGroupMembers(id: string) {
    return apiGet<GroupMembersPayload>(`/groups/${id}/members`);
}

export async function addGroupParticipant(groupId: string, userId: string) {
    return apiPost<Group, { userId: string }>(`/groups/${groupId}/participants`, { userId });
}

export async function removeGroupParticipant(groupId: string, userId: string) {
    return apiDelete<Group>(`/groups/${groupId}/participants/${userId}`);
}

export async function addGroupModerator(groupId: string, userId: string) {
    return apiPost<Group, { userId: string }>(`/groups/${groupId}/moderators`, { userId });
}

export async function removeGroupModerator(groupId: string, userId: string) {
    return apiDelete<Group>(`/groups/${groupId}/moderators/${userId}`);
}

export async function leaveGroup(groupId: string) {
    return apiPost<{ ok: boolean }>(`/groups/${groupId}/leave`, {});
}

export async function transferGroupOwner(groupId: string, userId: string) {
    return apiPost<Group, { userId: string }>(`/groups/${groupId}/owner`, { userId });
}

/* ------------------------------ invites ----------------------------- */

export async function createGroupInvite(groupId: string, expiresAt?: string) {
    return apiPost<GroupInviteResponse, { expiresAt?: string }>(
        `/groups/${groupId}/invites`,
        expiresAt ? { expiresAt } : {}
    );
}

export async function joinGroupByCode(code: string) {
    return apiPost<JoinGroupResponse, { code: string }>("/groups/join", { code });
}

/* ------------------------------ dashboard ---------------------------- */

export async function getGroupDashboard(id: string) {
    return apiGet<GroupDashboard>(`/groups/${id}/dashboard`);
}

/* ----------------------- legacy: group activity ---------------------- */
/* if backend still exposes /groups/activity; otherwise drop when unused */

export async function listGroupActivity() {
    return apiGet<GroupActivity[]>("/groups/activity");
}

/* ------------------------------ SWR hooks ---------------------------- */

export function useGroups(params?: ListGroupsParams) {
    const key = params ? `/groups${qs(params)}` : "/groups";
    return useSWR<PageResp<Group>>(key, () => listGroups(params));
}

export function useGroup(id?: string) {
    const key = id ? `/groups/${id}` : null;
    return useSWR<Group | undefined>(key, () => (id ? getGroup(id) : undefined));
}

export function useGroupDashboard(id?: string) {
    const key = id ? `/groups/${id}/dashboard` : null;
    return useSWR<GroupDashboard | undefined>(key, () =>
        id ? getGroupDashboard(id) : undefined
    );
}

export function useGroupMembers(id?: string) {
    const key = id ? `/groups/${id}/members` : null;
    return useSWR<GroupMembersPayload | undefined>(key, () =>
        id ? getGroupMembers(id) : undefined
    );
}

// keep for now; remove when you drop /groups/activity on backend
export function useGroupActivity() {
    const key = `/groups/activity`;
    return useSWR<GroupActivity[]>(key, listGroupActivity);
}
