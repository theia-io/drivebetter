import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type Role = "driver" | "dispatcher" | "customer" | "admin";

export interface JwtPayload {
    sub: string; // user id
    email?: string;
    roles?: Role[];
    typ?: "access" | "refresh";
    iat?: number;
    exp?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// Extract Bearer token
function getBearerToken(req: Request): string | null {
    const h = req.headers.authorization || "";
    const [scheme, token] = h.split(" ");
    if (scheme?.toLowerCase() === "bearer" && token) return token;
    return null;
}

export function userHasAdminRole(req: Request): boolean {
    const { roles } = getCurrentUser(req);
    return roles.includes("admin") || roles.includes("dispatcher");
}

export function getCurrentUser(req: Request): { id: string | null; roles: string[] } {
    const u: any = (req as any).user;
    if (!u) return { id: null, roles: [] };
    const id = u._id || u.id || null;
    const roles: string[] = Array.isArray(u.roles) ? u.roles : u.roles ? [u.roles] : [];
    return { id: id ? String(id) : null, roles };
}

// Auth guard: verifies access token and attaches user payload to req
export function requireAuth(req: Request, res: Response, next: NextFunction) {
    try {
        const token = getBearerToken(req);
        if (!token) return res.status(401).json({ error: "Missing Bearer token" });

        const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
        if (payload.typ && payload.typ !== "access") {
            return res.status(401).json({ error: "Invalid token type" });
        }

        // attach to request for downstream use
        (req as any).user = {
            id: payload.sub,
            email: payload.email,
            roles: payload.roles || [],
        };

        return next();
    } catch (err: any) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}

// Role guard: ensures the authenticated user has at least one of the roles
export function requireRole(roles: Role[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user as { id: string; roles: Role[] } | undefined;
        if (!user) return res.status(401).json({ error: "Unauthenticated" });

        const ok = user.roles?.some((r) => roles.includes(r));
        if (!ok) return res.status(403).json({ error: "Forbidden" });

        return next();
    };
}
