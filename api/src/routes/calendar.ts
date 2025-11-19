// src/controllers/calendar.controller.ts
import { Router, Request, Response } from "express";
import { Types } from "mongoose";
import Ride from "../models/ride.model";
import { requireAuth } from "../lib/auth";

const router = Router();

// ---------- helpers ----------
type Scope = "assigned" | "created" | "all";
type Window = "all" | "past" | "future";

function parseStatuses(q?: string | string[]) {
    if (!q) return undefined;
    const raw = Array.isArray(q) ? q.join(",") : q;
    const list = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    return list.length ? list : undefined;
}

function parseDate(s?: string): Date | undefined {
    if (!s) return undefined;
    const d = new Date(s);
    return isNaN(d.getTime()) ? undefined : d;
}

function startOfToday(now = new Date()) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
}
function startOfTomorrow(now = new Date()) {
    const d = startOfToday(now);
    d.setDate(d.getDate() + 1);
    return d;
}

function coerceLimit(x?: string) {
    const n = Math.max(1, Math.min(1000, Number(x || 100)));
    return Number.isFinite(n) ? n : 100;
}

function sortDir(x?: string): 1 | -1 {
    return x === "desc" ? -1 : 1;
}

function buildScopeMatch(scope: Scope, targetUserId?: string, allowBroad = false) {
    // allowBroad=true means admin/dispatcher can fetch broad sets (e.g., all assigned rides)
    const $or: any[] = [];
    if (scope === "assigned" || scope === "all") {
        if (targetUserId) $or.push({ assignedDriverId: targetUserId });
        else if (allowBroad) $or.push({ assignedDriverId: { $ne: null } });
    }
    if (scope === "created" || scope === "all") {
        if (targetUserId)
            $or.push({ creatorId: targetUserId }); // safe if absent in schema
        else if (allowBroad) $or.push({ creatorId: { $ne: null } });
    }
    return $or.length ? { $or } : {};
}

function buildTimeMatch(window: Window, from?: Date, to?: Date, now = new Date()) {
    // If caller provided explicit from/to, they override the window.
    const range: any = {};
    if (from || to) {
        if (from) range.$gte = from;
        if (to) range.$lt = to;
        return Object.keys(range).length ? { datetime: range } : {};
    }
    if (window === "past") {
        // include today -> anything strictly before start of tomorrow
        return { datetime: { $lt: startOfTomorrow(now) } };
    }
    if (window === "future") {
        // include today -> anything on/after start of today
        return { datetime: { $gte: startOfToday(now) } };
    }
    return {}; // "all"
}

function buildFilterMatch(req: Request) {
    const statuses = parseStatuses(req.query.status as any);
    const type = (req.query.type as string) || undefined;
    const m: any = {};
    if (statuses) m.status = { $in: statuses };
    if (type) m.type = type;
    return m;
}

function projection() {
    // Keep this thin and consistent for calendar use
    return "_id from to datetime status type assignedDriverId customer payment";
}

function sanitizeUserId(id?: string) {
    return id && Types.ObjectId.isValid(id) ? id : undefined;
}

async function runCalendarQuery({
    match,
    limit,
    sortAscending,
}: {
    match: any;
    limit: number;
    sortAscending: boolean;
}) {
    const items = await Ride.find(match)
        .select(projection())
        .sort({ datetime: sortAscending ? 1 : -1 })
        .limit(limit)
        .lean();

    return items.map((r: any) => ({
        _id: String(r._id),
        from: r.from,
        to: r.to,
        datetime: r.datetime,
        status: r.status,
        type: r.type,
        assignedDriverId: r.assignedDriverId ? String(r.assignedDriverId) : null,
        customer: r.customer
            ? { name: r.customer.name ?? "", phone: r.customer.phone ?? "" }
            : undefined,
        payment: r.payment
            ? {
                  method: r.payment.method,
                  paid: !!r.payment.paid,
                  driverPaid: !!r.payment.driverPaid,
                  amountCents:
                      typeof r.payment.amountCents === "number" ? r.payment.amountCents : undefined,
              }
            : undefined,
    }));
}

// ---------- /calendar/all ----------
/**
 * @openapi
 * /calendar/all:
 *   get:
 *     summary: All my rides (past & future)
 *     description: >
 *       Returns rides for the authenticated user.
 *       - If the user has role **driver**, this includes rides **assigned** to them and, if present, rides they **created**.
 *       - For other roles, this returns rides they **created** (if your model populates `creatorId`), plus any rides **assigned** to them.
 *     tags: [Calendar]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *         description: Comma-separated statuses (e.g. `unassigned,assigned,completed`).
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *         description: Ride type filter (e.g. `reservation` or `asap`).
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *         description: Inclusive lower bound for `datetime` (ISO8601).
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *         description: Exclusive upper bound for `datetime` (ISO8601).
 *       - in: query
 *         name: scope
 *         schema: { type: string, enum: [assigned, created, all], default: all }
 *         description: Choose which set(s) of rides to include for the current user.
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 1000, default: 100 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [asc, desc], default: asc }
 *         description: Sort by `datetime`.
 *     responses:
 *       200:
 *         description: Rides for calendar
 */
router.get("/all", requireAuth, async (req: Request, res: Response) => {
    const me = (req as any).user as { id: string; roles?: string[] };
    const roles = me?.roles ?? [];
    const isAdmin = roles.includes("admin");
    const isDispatcher = roles.includes("dispatcher");
    const isDriver = roles.includes("driver");

    const scope = ((req.query.scope as Scope) || "all") as Scope;

    const from = parseDate(req.query.from as string);
    const to = parseDate(req.query.to as string);
    const limit = coerceLimit(req.query.limit as string);
    const sortAscending = sortDir(req.query.sort as string) === 1;

    const match = {
        ...buildScopeMatch(scope, me.id, /*allowBroad*/ isAdmin || isDispatcher),
        ...buildTimeMatch("all", from, to),
        ...buildFilterMatch(req),
    };

    const items = await runCalendarQuery({ match, limit, sortAscending });
    return res.json({ items, scope, from: from || null, to: to || null });
});

// ---------- /calendar/past ----------
/**
 * @openapi
 * /calendar/past:
 *   get:
 *     summary: My past rides (including today)
 *     description: >
 *       Returns past rides for the authenticated user (includes **today**).
 *       Default scope is `all` (both assigned and created for the user).
 *       Pass `scope` to limit to `assigned` or `created`.
 *     tags: [Calendar]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: scope
 *         schema: { type: string, enum: [assigned, created, all], default: all }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 1000, default: 100 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [asc, desc], default: asc }
 *     responses:
 *       200:
 *         description: Rides for calendar
 */
router.get("/past", requireAuth, async (req: Request, res: Response) => {
    const me = (req as any).user as { id: string; roles?: string[] };
    const roles = me?.roles ?? [];
    const isAdmin = roles.includes("admin") || roles.includes("dispatcher");

    const scope = ((req.query.scope as Scope) || "all") as Scope;
    const from = parseDate(req.query.from as string);
    const to = parseDate(req.query.to as string);
    const limit = coerceLimit(req.query.limit as string);
    const sortAscending = sortDir(req.query.sort as string) === 1;

    const match = {
        ...buildScopeMatch(scope, me.id, /*allowBroad*/ isAdmin),
        ...buildTimeMatch("past", from, to),
        ...buildFilterMatch(req),
    };

    const items = await runCalendarQuery({ match, limit, sortAscending });
    return res.json({ items, scope, from: from || null, to: to || null });
});

// ---------- /calendar/future ----------
/**
 * @openapi
 * /calendar/future:
 *   get:
 *     summary: My future rides (including today)
 *     description: >
 *       Returns future rides for the authenticated user (includes **today**).
 *       Default scope is `all` (both assigned and created for the user).
 *       Pass `scope` to limit to `assigned` or `created`.
 *     tags: [Calendar]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: scope
 *         schema: { type: string, enum: [assigned, created, all], default: all }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 1000, default: 100 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [asc, desc], default: asc }
 *     responses:
 *       200:
 *         description: Rides for calendar
 */
router.get("/future", requireAuth, async (req: Request, res: Response) => {
    const me = (req as any).user as { id: string; roles?: string[] };
    const roles = me?.roles ?? [];
    const isAdmin = roles.includes("admin") || roles.includes("dispatcher");

    const scope = ((req.query.scope as Scope) || "all") as Scope;
    const from = parseDate(req.query.from as string);
    const to = parseDate(req.query.to as string);
    const limit = coerceLimit(req.query.limit as string);
    const sortAscending = sortDir(req.query.sort as string) === 1;

    const match = {
        ...buildScopeMatch(scope, me.id, /*allowBroad*/ isAdmin),
        ...buildTimeMatch("future", from, to),
        ...buildFilterMatch(req),
    };

    const items = await runCalendarQuery({ match, limit, sortAscending });
    return res.json({ items, scope, from: from || null, to: to || null });
});

// ---------- /calendar/{userId} (admin/dispatcher) ----------
/**
 * @openapi
 * /calendar/{userId}:
 *   get:
 *     summary: Rides for a specific user (for calendar)
 *     description: >
 *       Returns rides for the given user. **Admin/Dispatcher only**.
 *       Use `scope` to choose between rides assigned to the user, created by the user, or both.
 *     tags: [Calendar]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: scope
 *         schema: { type: string, enum: [assigned, created, all], default: all }
 *       - in: query
 *         name: window
 *         schema: { type: string, enum: [all, past, future], default: all }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 1000, default: 100 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [asc, desc], default: asc }
 *     responses:
 *       200:
 *         description: Rides for calendar
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden
 */
router.get("/:userId", requireAuth, async (req: Request, res: Response) => {
    const me = (req as any).user as { id: string; roles?: string[] };
    const roles = me?.roles ?? [];
    const isPrivileged = roles.includes("admin") || roles.includes("dispatcher");
    if (!isPrivileged) {
        return res.status(403).json({ error: "Forbidden" });
    }

    const userId = sanitizeUserId(req.params.userId);
    if (!userId) {
        return res.status(400).json({ error: "Invalid userId" });
    }

    const scope = ((req.query.scope as Scope) || "all") as Scope;
    const window = ((req.query.window as Window) || "all") as Window;

    const from = parseDate(req.query.from as string);
    const to = parseDate(req.query.to as string);
    const limit = coerceLimit(req.query.limit as string);
    const sortAscending = sortDir(req.query.sort as string) === 1;

    const match = {
        ...buildScopeMatch(scope, userId, /*allowBroad*/ true),
        ...buildTimeMatch(window, from, to),
        ...buildFilterMatch(req),
    };

    const items = await runCalendarQuery({ match, limit, sortAscending });
    return res.json({ items, scope, userId, window, from: from || null, to: to || null });
});

export default router;
