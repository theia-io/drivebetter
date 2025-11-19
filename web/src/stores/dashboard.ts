import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types/user";
import type { Ride } from "@/types/ride";
import type { Group } from "@/types/group";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api/v1";

interface DashboardStats {
    todayRides: number;
    thisWeek: number;
    rating: number;
    earnings: number;
    totalRides: number;
    totalEarnings: number;
    averageRating: number;
    memberSince: string;
}

interface RecentActivity {
    id: string;
    type: "ride_completed" | "ride_in_progress" | "ride_scheduled";
    passenger: string;
    pickup: string;
    destination: string;
    time: string;
    status: string;
    rating?: number | null;
    fare?: number;
}

interface QuickAction {
    id: string;
    title: string;
    icon: string;
    action: string;
    enabled: boolean;
}

interface DashboardState {
    stats: DashboardStats | null;
    recentActivity: RecentActivity[];
    quickActions: QuickAction[];
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchDashboardData: () => Promise<void>;
    fetchStats: () => Promise<void>;
    fetchRecentActivity: () => Promise<void>;
    fetchQuickActions: () => Promise<void>;

    // Clear state
    clearError: () => void;
    clearDashboard: () => void;
}

const getAuthHeaders = () => {
    const token = localStorage.getItem("accessToken");
    return {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
    };
};

export const useDashboardStore = create<DashboardState>()(
    persist(
        (set, get) => ({
            stats: null,
            recentActivity: [],
            quickActions: [],
            isLoading: false,
            error: null,

            async fetchDashboardData() {
                set({ isLoading: true, error: null });
                try {
                    await Promise.all([
                        get().fetchStats(),
                        get().fetchRecentActivity(),
                        get().fetchQuickActions(),
                    ]);
                    set({ isLoading: false });
                } catch (error) {
                    console.error("[dashboard] fetchDashboardData failed:", error);
                    set({
                        error:
                            error instanceof Error
                                ? error.message
                                : "Failed to fetch dashboard data",
                        isLoading: false,
                    });
                }
            },

            async fetchStats() {
                try {
                    const res = await fetch(`${API_BASE}/dashboard/stats`, {
                        headers: getAuthHeaders(),
                    });

                    if (!res.ok) {
                        throw new Error(`Failed to fetch dashboard stats: ${res.statusText}`);
                    }

                    const stats: DashboardStats = await res.json();
                    set({ stats });
                } catch (error) {
                    console.error("[dashboard] fetchStats failed:", error);
                    throw error;
                }
            },

            async fetchRecentActivity() {
                try {
                    const res = await fetch(`${API_BASE}/dashboard/recent-activity`, {
                        headers: getAuthHeaders(),
                    });

                    if (!res.ok) {
                        throw new Error(`Failed to fetch recent activity: ${res.statusText}`);
                    }

                    const recentActivity: RecentActivity[] = await res.json();
                    set({ recentActivity });
                } catch (error) {
                    console.error("[dashboard] fetchRecentActivity failed:", error);
                    throw error;
                }
            },

            async fetchQuickActions() {
                try {
                    const res = await fetch(`${API_BASE}/dashboard/quick-actions`, {
                        headers: getAuthHeaders(),
                    });

                    if (!res.ok) {
                        throw new Error(`Failed to fetch quick actions: ${res.statusText}`);
                    }

                    const quickActions: QuickAction[] = await res.json();
                    set({ quickActions });
                } catch (error) {
                    console.error("[dashboard] fetchQuickActions failed:", error);
                    throw error;
                }
            },

            clearError() {
                set({ error: null });
            },

            clearDashboard() {
                set({
                    stats: null,
                    recentActivity: [],
                    quickActions: [],
                    error: null,
                });
            },
        }),
        {
            name: "dashboard-storage",
            partialize: (state) => ({
                stats: state.stats,
                recentActivity: state.recentActivity,
                quickActions: state.quickActions,
            }),
        }
    )
);
