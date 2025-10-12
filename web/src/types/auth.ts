import type { User } from "./user";

export interface LoginResponse {
    user: Pick<User, "_id" | "email" | "roles" | "emailVerified">;
    accessToken: string;
    refreshToken: string;
}

export interface MeResponse extends User {}
