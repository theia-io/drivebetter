// web/ui/src/stores/auth.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types/user";
import type { LoginResponse } from "@/types/auth";

const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api/v1";

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    fetchMe: () => Promise<User | null>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            isLoading: false,

            async login(email: string, password: string) {
                set({ isLoading: true });
                try {
                    const res = await fetch(`${API_BASE}/auth/login`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email, password }),
                    });
                    if (!res.ok) throw new Error("Invalid credentials");

                    const data: LoginResponse = await res.json();

                    // store tokens (simple for now; can move to cookies later)
                    localStorage.setItem("accessToken", data.accessToken);
                    localStorage.setItem("refreshToken", data.refreshToken);

                    set({
                        user: data.user as User,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                    return true;
                } catch (e) {
                    console.error("[auth] login failed:", e);
                    set({ isAuthenticated: false, isLoading: false, user: null });
                    return false;
                }
            },

            logout() {
                // best-effort server logout
                const refreshToken = localStorage.getItem("refreshToken");
                if (refreshToken) {
                    fetch(`${API_BASE}/auth/logout`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ refreshToken }),
                    }).catch(() => {});
                }
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                set({ user: null, isAuthenticated: false });
            },

            async fetchMe() {
                const token = localStorage.getItem("accessToken");
                if (!token) {
                    set({ isAuthenticated: false, user: null });
                    return null;
                }
                try {
                    const res = await fetch(`${API_BASE}/auth/me`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (!res.ok) throw new Error("unauthorized");
                    const me: User = await res.json();
                    set({ user: me, isAuthenticated: true });
                    return me;
                } catch {
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
