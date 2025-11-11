// web/ui/src/stores/auth.ts
import {
    apiGet,
    apiPost,
    getAccessToken,
    getRefreshToken,
    removeAccessToken,
    removeRefreshToken,
    setAccessToken,
    setRefreshToken,
} from "@/services/http";
import type { LoginResponse } from "@/types/auth";
import type { User } from "@/types/user";
import { create } from "zustand";
import { persist } from "zustand/middleware";

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
          const data = await apiPost<LoginResponse>(
            "/auth/login",
            { email, password },
            { noAuth: true }
          );
          setAccessToken(data.accessToken);
          setRefreshToken(data.refreshToken);
          set({
            user: data.user as User,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch (e) {
          console.error("[auth] login failed:", e);
          set({ isAuthenticated: false, isLoading: false, user: null });
          let errorMessage = "Login failed. Please try again.";

          if (e && typeof e === "object") {
            if (e.error && typeof e.error === "string") {
              errorMessage = e.error;
            } else if (e.message && typeof e.message === "string") {
              errorMessage = e.message;
            }
          }

          throw new Error(errorMessage);
        }
      },

      async logout() {
        try {
          const refreshToken = getRefreshToken();
          if (refreshToken) {
            await apiPost<void>(
              "/auth/logout",
              { refreshToken },
              { noAuth: true }
            );
          }
        } catch {
          // best-effort
        } finally {
          removeAccessToken();
          removeRefreshToken();
          set({ user: null, isAuthenticated: false });
        }
      },

      async fetchMe() {
        const token = getAccessToken();
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
