// web/ui/src/stores/auth.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiGet, apiPost } from "@/services/http";
import type { User } from "@/types/user";
import type { LoginResponse } from "@/types/auth";

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    fetchMe: () => Promise<User | null>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            isLoading: false,

            async login(email: string, password: string) {
                set({ isLoading: true });
                try {
                    const data = await apiPost<LoginResponse>("/auth/login", { email, password }, { noAuth: true });
                    localStorage.setItem("accessToken", data.accessToken);
                    localStorage.setItem("refreshToken", data.refreshToken);
                    set({ user: data.user as User, isAuthenticated: true, isLoading: false });
                    return true;
                } catch (e) {
                    console.error("[auth] login failed:", e);
                    set({ isAuthenticated: false, isLoading: false, user: null });
                    return false;
                }
            },

            async logout() {
                try {
                    const refreshToken = localStorage.getItem("refreshToken");
                    if (refreshToken) {
                        await apiPost<void>("/auth/logout", { refreshToken }, { noAuth: true });
                    }
                } catch {
                    // best-effort
                } finally {
                    localStorage.removeItem("accessToken");
                    localStorage.removeItem("refreshToken");
                    set({ user: null, isAuthenticated: false });
                }
            },

            async fetchMe() {
                const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
                if (!token) {
                    set({ isAuthenticated: false, user: null });
                    return null;
                }
                try {
                    const me = await apiGet<User>("/auth/me");
                    set({ user: me, isAuthenticated: true });
                    return me;
                } catch (e) {
                    console.warn("[auth] fetchMe failed:", e);
                    set({ isAuthenticated: false, user: null });
                    return null;
                }
            },
        }),
        {
            name: "auth-storage",
            partialize: (s) => ({
                user: s.user,
                isAuthenticated: s.isAuthenticated,
            }),
        }
    )
);
