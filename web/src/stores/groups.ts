import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Group, CreateGroupRequest, UpdateGroupRequest, GroupActivity } from "@/types/group";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api/v1";

interface GroupsState {
  groups: Group[];
  groupActivity: GroupActivity[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchGroups: () => Promise<void>;
  fetchGroup: (id: string) => Promise<Group | null>;
  createGroup: (group: CreateGroupRequest) => Promise<Group | null>;
  updateGroup: (id: string, updates: UpdateGroupRequest) => Promise<Group | null>;
  deleteGroup: (id: string) => Promise<boolean>;
  joinGroup: (groupId: string) => Promise<boolean>;
  leaveGroup: (groupId: string) => Promise<boolean>;
  
  // Activity
  fetchGroupActivity: () => Promise<void>;
  
  // Filtering and search
  searchGroups: (query: string) => Group[];
  filterGroupsByType: (type: string) => Group[];
  filterGroupsByCity: (city: string) => Group[];
  
  // Clear state
  clearError: () => void;
  clearGroups: () => void;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const useGroupsStore = create<GroupsState>()(
  persist(
    (set, get) => ({
      groups: [],
      groupActivity: [],
      isLoading: false,
      error: null,

      async fetchGroups() {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/groups`, {
            headers: getAuthHeaders(),
          });
          
          if (!res.ok) {
            throw new Error(`Failed to fetch groups: ${res.statusText}`);
          }
          
          const groups: Group[] = await res.json();
          set({ groups, isLoading: false });
        } catch (error) {
          console.error("[groups] fetchGroups failed:", error);
          set({ 
            error: error instanceof Error ? error.message : "Failed to fetch groups",
            isLoading: false 
          });
        }
      },

      async fetchGroup(id: string) {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/groups/${id}`, {
            headers: getAuthHeaders(),
          });
          
          if (!res.ok) {
            throw new Error(`Failed to fetch group: ${res.statusText}`);
          }
          
          const group: Group = await res.json();
          set({ isLoading: false });
          
          // Update the group in the list if it exists
          const { groups } = get();
          const updatedGroups = groups.map(g => g.id === id ? group : g);
          set({ groups: updatedGroups });
          
          return group;
        } catch (error) {
          console.error("[groups] fetchGroup failed:", error);
          set({ 
            error: error instanceof Error ? error.message : "Failed to fetch group",
            isLoading: false 
          });
          return null;
        }
      },

      async createGroup(groupData: CreateGroupRequest) {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/groups`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(groupData),
          });
          
          if (!res.ok) {
            throw new Error(`Failed to create group: ${res.statusText}`);
          }
          
          const newGroup: Group = await res.json();
          const { groups } = get();
          set({ 
            groups: [newGroup, ...groups],
            isLoading: false 
          });
          
          return newGroup;
        } catch (error) {
          console.error("[groups] createGroup failed:", error);
          set({ 
            error: error instanceof Error ? error.message : "Failed to create group",
            isLoading: false 
          });
          return null;
        }
      },

      async updateGroup(id: string, updates: UpdateGroupRequest) {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/groups/${id}`, {
            method: "PATCH",
            headers: getAuthHeaders(),
            body: JSON.stringify(updates),
          });
          
          if (!res.ok) {
            throw new Error(`Failed to update group: ${res.statusText}`);
          }
          
          const updatedGroup: Group = await res.json();
          const { groups } = get();
          const updatedGroups = groups.map(g => g.id === id ? updatedGroup : g);
          set({ 
            groups: updatedGroups,
            isLoading: false 
          });
          
          return updatedGroup;
        } catch (error) {
          console.error("[groups] updateGroup failed:", error);
          set({ 
            error: error instanceof Error ? error.message : "Failed to update group",
            isLoading: false 
          });
          return null;
        }
      },

      async deleteGroup(id: string) {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/groups/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders(),
          });
          
          if (!res.ok) {
            throw new Error(`Failed to delete group: ${res.statusText}`);
          }
          
          const { groups } = get();
          const updatedGroups = groups.filter(g => g.id !== id);
          set({ 
            groups: updatedGroups,
            isLoading: false 
          });
          
          return true;
        } catch (error) {
          console.error("[groups] deleteGroup failed:", error);
          set({ 
            error: error instanceof Error ? error.message : "Failed to delete group",
            isLoading: false 
          });
          return false;
        }
      },

      async joinGroup(groupId: string) {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/groups/${groupId}/join`, {
            method: "POST",
            headers: getAuthHeaders(),
          });
          
          if (!res.ok) {
            throw new Error(`Failed to join group: ${res.statusText}`);
          }
          
          // Refresh the group data
          await get().fetchGroup(groupId);
          set({ isLoading: false });
          
          return true;
        } catch (error) {
          console.error("[groups] joinGroup failed:", error);
          set({ 
            error: error instanceof Error ? error.message : "Failed to join group",
            isLoading: false 
          });
          return false;
        }
      },

      async leaveGroup(groupId: string) {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/groups/${groupId}/leave`, {
            method: "POST",
            headers: getAuthHeaders(),
          });
          
          if (!res.ok) {
            throw new Error(`Failed to leave group: ${res.statusText}`);
          }
          
          // Refresh the group data
          await get().fetchGroup(groupId);
          set({ isLoading: false });
          
          return true;
        } catch (error) {
          console.error("[groups] leaveGroup failed:", error);
          set({ 
            error: error instanceof Error ? error.message : "Failed to leave group",
            isLoading: false 
          });
          return false;
        }
      },

      async fetchGroupActivity() {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/groups/activity`, {
            headers: getAuthHeaders(),
          });
          
          if (!res.ok) {
            throw new Error(`Failed to fetch group activity: ${res.statusText}`);
          }
          
          const activity: GroupActivity[] = await res.json();
          set({ groupActivity: activity, isLoading: false });
        } catch (error) {
          console.error("[groups] fetchGroupActivity failed:", error);
          set({ 
            error: error instanceof Error ? error.message : "Failed to fetch group activity",
            isLoading: false 
          });
        }
      },

      searchGroups(query: string) {
        const { groups } = get();
        if (!query.trim()) return groups;
        
        const lowercaseQuery = query.toLowerCase();
        return groups.filter(group => 
          group.name.toLowerCase().includes(lowercaseQuery) ||
          group.description?.toLowerCase().includes(lowercaseQuery) ||
          group.location?.toLowerCase().includes(lowercaseQuery) ||
          group.city?.toLowerCase().includes(lowercaseQuery)
        );
      },

      filterGroupsByType(type: string) {
        const { groups } = get();
        return groups.filter(group => group.type === type);
      },

      filterGroupsByCity(city: string) {
        const { groups } = get();
        return groups.filter(group => group.city === city);
      },

      clearError() {
        set({ error: null });
      },

      clearGroups() {
        set({ groups: [], groupActivity: [], error: null });
      },
    }),
    {
      name: "groups-storage",
      partialize: (state) => ({
        groups: state.groups,
        groupActivity: state.groupActivity,
      }),
    }
  )
);
