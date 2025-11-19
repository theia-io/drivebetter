// web/ui/src/services/groups.ts
import useSWR from "swr";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/services/http";
import type { Group, CreateGroupRequest, UpdateGroupRequest, GroupActivity } from "@/types/group";
import { PageResp } from "@/types";

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

/* -------------------------------- API -------------------------------- */

export type GroupsListQuery = {
    q?: string;
    type?: string;
    city?: string;
    page?: number; // optional if your API supports paging
    limit?: number; // optional
};

export const listGroups = (params?: GroupsListQuery) =>
    apiGet<PageResp<Group>>(`/groups${qs(params)}`);

export const getGroup = (id: string) => apiGet<Group>(`/groups/${id}`);

export const createGroup = (payload: CreateGroupRequest) => apiPost<Group>(`/groups`, payload);

export const updateGroup = (id: string, payload: UpdateGroupRequest) =>
    apiPatch<Group>(`/groups/${id}`, payload);

export const deleteGroup = (id: string) => apiDelete<void>(`/groups/${id}`);

/** Add/remove members in one call (POST /groups/:id/members) */
export const updateGroupMembers = (id: string, add: string[], remove: string[]) =>
    apiPost<Group>(`/groups/${id}/members`, { add, remove });

/** Membership helpers */
export const joinGroup = (groupId: string) => apiPost<{ ok: true }>(`/groups/${groupId}/join`, {});

export const leaveGroup = (groupId: string) =>
    apiPost<{ ok: true }>(`/groups/${groupId}/leave`, {});

/** Activity feed (if exposed by your API) */
export const listGroupActivity = () => apiGet<GroupActivity[]>(`/groups/activity`);

/* -------------------------------- Hooks ------------------------------- */

export function useGroups(params?: GroupsListQuery) {
    const key = `/groups${qs(params)}`;
    return useSWR<PageResp<Group>>(key, () => listGroups(params));
}

export function useGroup(id?: string) {
    const key = id ? `/groups/${id}` : null;
    return useSWR<Group>(key, () => getGroup(id as string));
}

export function useDeleteGroup(id?: string) {
    const key = id ? `/groups/${id}` : null;
    return useSWR<void>(key, () => deleteGroup(id as string));
}

export function useGroupActivity() {
    const key = `/groups/activity`;
    return useSWR<GroupActivity[]>(key, listGroupActivity);
}
