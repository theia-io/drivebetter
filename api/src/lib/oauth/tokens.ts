import jwt from "jsonwebtoken";

const ACCESS_TTL = "15m";
const REFRESH_TTL = "30d";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

type Roles = Array<"driver" | "dispatcher" | "client" | "admin">;

export interface JwtPayload {
    sub: string;
    email?: string;
    roles?: Roles;
    typ?: "access" | "refresh";
}

export function signAccessToken(user: { id: string; email?: string; roles?: Roles }) {
    const payload: JwtPayload = { sub: user.id, email: user.email, roles: user.roles, typ: "access" };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TTL });
}

export function signRefreshToken(user: { id: string; email?: string; roles?: Roles }) {
    const payload: JwtPayload = { sub: user.id, email: user.email, roles: user.roles, typ: "refresh" };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TTL });
}

export function verifyToken<T extends JwtPayload = JwtPayload>(token: string): T {
    return jwt.verify(token, JWT_SECRET) as T;
}
