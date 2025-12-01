import { Router, Request, Response } from "express";
import User from "../models/user.model";
import bcrypt from "bcryptjs";
import { hashPassword } from "../lib/crypto";
import { Types } from "mongoose";
import { requireAuth } from "../lib/auth";
import {Group} from "../models/group.model";
import Ride from "../models/ride.model";
import DriverDetails from "../models/driverDetails.model";

const router = Router();

/**
 * @openapi
 * /users:
 *   get:
 *     summary: List users
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [driver, dispatcher, client, admin]
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search by name or email (case-insensitive)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Paginated users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 page: { type: integer }
 *                 limit: { type: integer }
 *                 total: { type: integer }
 *                 pages: { type: integer }
 */
router.get("/", async (req: Request, res: Response) => {
    const page = Math.max(parseInt(String(req.query.page ?? "1"), 10) || 1, 1);
    const limitRaw = Math.max(parseInt(String(req.query.limit ?? "20"), 10) || 20, 1);
    const limit = Math.min(limitRaw, 100);

    const role = (req.query.role as string) || "";
    const q = (req.query.q as string) || "";

    const filter: any = {};
    if (role) filter.roles = role;
    if (q) {
        filter.$or = [
            { name: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
            { phone: { $regex: q, $options: "i" } },
        ];
    }

    const total = await User.countDocuments(filter);
    const items = await User.find(filter)
        .select({ _id: 1, name: 1, email: 1, phone: 1, roles: 1, createdAt: 1, updatedAt: 1 })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
});

/**
 * @openapi
 * /users/drivers:
 *   get:
 *     summary: Get all drivers (public fields only)
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of drivers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:  { type: string }
 *                   name:  { type: string }
 *                   email: { type: string }
 *                   phone: { type: string }
 *                   roles:
 *                     type: array
 *                     items: { type: string }
 */
router.get("/drivers", async (_req: Request, res: Response) => {
    const drivers = await User.find({ roles: "driver" })
        .select({ name: 1, email: 1, phone: 1, roles: 1, _id: 1 })
        .lean();
    res.json(drivers);
});

// keep your ObjectId-constrained route after this
router.get("/:id([0-9a-fA-F]{24})", async (req: Request, res: Response) => {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
});

/**
/**
 * @openapi
 * /users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Jane Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jane@example.com
 *               phone:
 *                 type: string
 *                 example: "+1 555 123 4567"
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [driver, dispatcher, client, admin]
 *                 example: ["driver"]
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: Plaintext password; stored as a bcrypt hash server-side.
 *                 example: "secret123"
 *     responses:
 *       201:
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       409:
 *         description: Email already in use
 *       400:
 *         description: Validation error
 */
router.post("/", async (req: Request, res: Response) => {
    try {
        const { name, email, phone, roles, password } = req.body || {};

        if (!name || !email) {
            return res.status(400).json({ error: "name and email are required" });
        }

        // Ensure unique email
        const exists = await User.findOne({ email }).lean();
        if (exists) {
            return res.status(409).json({ error: "Email already in use" });
        }

        let passwordHash: string | undefined = undefined;
        if (password != null) {
            if (typeof password !== "string" || password.length < 6) {
                return res
                    .status(400)
                    .json({ error: "password must be a string with at least 6 characters" });
            }
            passwordHash = await hashPassword(password);
        }

        const userDoc = await User.create({
            name,
            email,
            phone,
            roles,
            passwordHash: passwordHash,
        });

        const user = userDoc.toObject();
        delete (user as any).passwordHash;

        return res.status(201).json(user);
    } catch (err: any) {
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /users:
 *   get:
 *     summary: List users
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [driver, dispatcher, client, admin] }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search by name or email (case-insensitive)
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items: { type: array, items: { $ref: '#/components/schemas/User' } }
 *                 page: { type: integer }
 *                 limit: { type: integer }
 *                 total: { type: integer }
 *                 pages: { type: integer }
 */
router.get("/", async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));

    const filter: any = {};
    if (req.query.role) filter.roles = req.query.role;

    if (req.query.q) {
        const q = String(req.query.q).trim();
        filter.$or = [
            { name: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
        ];
    }

    const total = await User.countDocuments(filter);
    const items = await User.find(filter)
        .select(
            "-passwordHash -refreshTokens -otpCode -otpExpires -resetToken -resetExpires -emailVerifyToken -emailVerifyExpires"
        )
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
});

/**
 * @openapi
 * /users/{id}/groups:
 *   get:
 *     summary: List groups a user belongs to
 *     description: Returns groups where the user is a member. The caller must be the same user or have the `admin` or `dispatcher` role.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: User ID
 *     responses:
 *       200:
 *         description: List of groups
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:          { type: string }
 *                   name:         { type: string }
 *                   description:  { type: string }
 *                   type:         { type: string, enum: ["public", "private", "partner", "other"] }
 *                   city:         { type: string }
 *                   location:     { type: string }
 *                   visibility:   { type: string, enum: ["public", "private", "restricted"] }
 *                   isInviteOnly: { type: boolean }
 *                   tags:
 *                     type: array
 *                     items: { type: string }
 *                   createdAt:    { type: string, format: date-time }
 *                   updatedAt:    { type: string, format: date-time }
 *       401:
 *         description: Unauthorized (missing/invalid token)
 *       403:
 *         description: Forbidden (not the same user and lacks admin/dispatcher)
 */
router.get("/:id([0-9a-fA-F]{24})/groups", requireAuth, async (req: Request, res: Response) => {
    const targetUserId = req.params.id;

    const me = (req as any).user as { id: string; roles: string[] };

    const isSelf = me?.id === targetUserId;
    const isPrivileged = me?.roles?.some((r) => r === "admin" || r === "dispatcher" || r === "driver");
    if (!isSelf && !isPrivileged) {
        console.error("[getUsers/groups] Error ensuring ACL:", targetUserId, me);
        return res.status(403).json({ error: "Forbidden" });
    }

    const groups = await Group.find({ participants: targetUserId })
        .select({
            _id: 1,
            name: 1,
            description: 1,
            type: 1,
            city: 1,
            location: 1,
            visibility: 1,
            isInviteOnly: 1,
            tags: 1,
            createdAt: 1,
            updatedAt: 1,
        })
        .lean();

    return res.json(groups);
});

/**
 * @openapi
 * /users/drivers:
 *   get:
 *     summary: List drivers (public fields)
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Drivers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:   { type: string }
 *                   name:  { type: string }
 *                   email: { type: string }
 *                   phone: { type: string }
 *                   roles:
 *                     type: array
 *                     items: { type: string }
 */
router.get("/drivers", async (_req: Request, res: Response) => {
    const drivers = await User.find({ roles: "driver" })
        .select({ _id: 1, name: 1, email: 1, phone: 1, roles: 1 })
        .lean();
    res.json(drivers);
});

/**
 * @openapi
 * /users/drivers/{id}:
 *   get:
 *     summary: List driver by ID (public fields)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Drivers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:   { type: string }
 *                   name:  { type: string }
 *                   email: { type: string }
 *                   phone: { type: string }
 *                   roles:
 *                     type: array
 *                     items: { type: string }
 */
router.get("/drivers/:id([0-9a-fA-F]{24})", async (req: Request, res: Response) => {
    const drivers = await User.findById(req.params.id)
        .select({ _id: 1, name: 1, email: 1, phone: 1, roles: 1 })
        .lean();
    res.json(drivers);
});

/**
 * @openapi
 * /users/drivers/batch:
 *   post:
 *     summary: Get public driver fields by a list of user IDs
 *     description: |
 *       Returns public fields for the provided user IDs. Results are ordered to match the input list.
 *       Invalid ObjectIds and non-existent IDs are ignored.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 200
 *                 items:
 *                   type: string
 *                   description: MongoDB ObjectId of a user
 *             example:
 *               ids: ["60f7c2a9d2c3a31b8c8b4567", "60f7c2a9d2c3a31b8c8b4568"]
 *     responses:
 *       200:
 *         description: Array of public driver fields, ordered like the input
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:   { type: string }
 *                   name:  { type: string }
 *                   email: { type: string }
 *                   phone: { type: string }
 *                   roles:
 *                     type: array
 *                     items: { type: string }
 *       400:
 *         description: Bad request (e.g., missing or too many IDs)
 */
router.post("/drivers/batch", async (req: Request, res: Response) => {
    try {
        const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];

        if (!ids.length) {
            return res.status(400).json({ error: "ids must be a non-empty array of strings" });
        }
        if (ids.length > 200) {
            return res.status(400).json({ error: "Too many ids; max 200 per request" });
        }

        // Validate ObjectIds and dedupe while keeping first occurrence order
        const seen = new Set<string>();
        const validIds: string[] = [];
        for (const id of ids) {
            if (typeof id !== "string") continue;
            if (!Types.ObjectId.isValid(id)) continue;
            if (!seen.has(id)) {
                seen.add(id);
                validIds.push(id);
            }
        }

        if (!validIds.length) {
            return res.json([]); // nothing valid to fetch
        }

        const docs = await User.find({ _id: { $in: validIds } })
            .select({ _id: 1, name: 1, email: 1, phone: 1, roles: 1 })
            .lean();

        // Map results by id for O(1) lookups, then order as per input (skipping missing)
        const byId = new Map(docs.map((d: any) => [String(d._id), d]));
        const ordered = ids.filter((id: string) => byId.has(id)).map((id: string) => byId.get(id));

        res.json(ordered);
    } catch (err: any) {
        console.error("drivers batch error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404: { description: Not found }
 */
router.get("/:id([0-9a-fA-F]{24})", async (req: Request, res: Response) => {
    const user = await User.findById(req.params.id)
        .select(
            "-passwordHash -refreshTokens -otpCode -otpExpires -resetToken -resetExpires -emailVerifyToken -emailVerifyExpires"
        )
        .lean();
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
});

/**
 * @openapi
 * /users:
 *   post:
 *     summary: Create user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email]
 *             properties:
 *               name:  { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               roles:
 *                 type: array
 *                 items: { type: string, enum: [driver, dispatcher, client, admin] }
 *     responses:
 *       201:
 *         description: Created
 *       409:
 *         description: Email exists
 */
router.post("/", async (req: Request, res: Response) => {
    try {
        const { name, email, phone, roles } = req.body;
        const exists = await User.findOne({ email });
        if (exists) return res.status(409).json({ error: "Email already in use" });
        const user = await User.create({ name, email, phone, roles });
        const plain = user.toObject();
        // strip sensitive
        delete (plain as any).passwordHash;
        delete (plain as any).refreshTokens;
        res.status(201).json(plain);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /users/{id}:
 *   put:
 *     summary: Replace user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email]
 *             properties:
 *               name:  { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               roles:
 *                 type: array
 *                 items: { type: string, enum: [driver, dispatcher, client, admin] }
 *     responses:
 *       200: { description: Replaced }
 *       404: { description: Not found }
 */
router.put("/:id([0-9a-fA-F]{24})", async (req: Request, res: Response) => {
    const { name, email, phone, roles } = req.body;
    const doc = await User.findByIdAndUpdate(
        req.params.id,
        { $set: { name, email, phone, roles } },
        { new: true, runValidators: true, overwrite: true }
    )
        .select("-passwordHash -refreshTokens")
        .lean();
    if (!doc) return res.status(404).json({ error: "User not found" });
    res.json(doc);
});

/**
 * @openapi
 * /users/{id}:
 *   patch:
 *     summary: Update user (partial)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:  { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               roles:
 *                 type: array
 *                 items: { type: string, enum: [driver, dispatcher, client, admin] }
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 */
router.patch("/:id([0-9a-fA-F]{24})", async (req: Request, res: Response) => {
    const allowed = ["name", "email", "phone", "roles"] as const;
    const $set: any = {};
    for (const k of allowed) if (k in req.body) $set[k] = req.body[k];
    const doc = await User.findByIdAndUpdate(
        req.params.id,
        Object.keys($set).length ? { $set } : {},
        { new: true, runValidators: true }
    )
        .select("-passwordHash -refreshTokens")
        .lean();
    if (!doc) return res.status(404).json({ error: "User not found" });
    res.json(doc);
});

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Delete user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 *       404: { description: Not found }
 */
router.delete("/:id([0-9a-fA-F]{24})", async (req: Request, res: Response) => {
    const r = await User.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "User not found" });
    res.json({ ok: true });
});

/**
 * @openapi
 * /users/{id}/groups:
 *   get:
 *     summary: List groups a user belongs to
 *     description: >
 *       Returns groups where the user is an owner, moderator, or participant.
 *       The caller must be the same user or have the `admin` or `dispatcher` role.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: User ID
 *     responses:
 *       200:
 *         description: List of groups with membership role
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:          { type: string }
 *                   name:         { type: string }
 *                   description:  { type: string }
 *                   type:
 *                     type: string
 *                     enum: ["fleet", "coop", "airport", "city", "custom", "global"]
 *                   city:         { type: string }
 *                   location:     { type: string }
 *                   visibility:
 *                     type: string
 *                     enum: ["public", "private"]
 *                   isInviteOnly: { type: boolean }
 *                   tags:
 *                     type: array
 *                     items: { type: string }
 *                   membershipRole:
 *                     type: string
 *                     enum: ["owner", "moderator", "participant"]
 *                   createdAt:    { type: string, format: date-time }
 *                   updatedAt:    { type: string, format: date-time }
 *       401:
 *         description: Unauthorized (missing/invalid token)
 *       403:
 *         description: Forbidden (not the same user and lacks admin/dispatcher)
 */
router.get(
    "/:id([0-9a-fA-F]{24})/groups",
    requireAuth,
    async (req: Request, res: Response) => {
        const targetUserId = req.params.id;
        const me = (req as any).user as { id: string; roles: string[] };

        const isSelf = me?.id === targetUserId;
        const isPrivileged = me?.roles?.some((r) => r === "admin" || r === "dispatcher");
        if (!isSelf && !isPrivileged) {
            console.error("[getUsers/groups] Error ensuring ACL:", targetUserId, me);
            return res.status(403).json({ error: "Forbidden" });
        }

        const userObjectId = new Types.ObjectId(targetUserId);

        const rawGroups = await Group.find({
            $or: [
                { ownerId: userObjectId },
                { moderators: userObjectId },
                { participants: userObjectId },
            ],
        })
            .select({
                _id: 1,
                name: 1,
                description: 1,
                type: 1,
                city: 1,
                location: 1,
                visibility: 1,
                isInviteOnly: 1,
                tags: 1,
                createdAt: 1,
                updatedAt: 1,
                ownerId: 1,
                moderators: 1,
                participants: 1,
            })
            .lean();

        const items = rawGroups.map((g: any) => {
            let membershipRole: "owner" | "moderator" | "participant" = "participant";

            if (g.ownerId && String(g.ownerId) === targetUserId) {
                membershipRole = "owner";
            } else if (
                Array.isArray(g.moderators) &&
                g.moderators.some((id: any) => String(id) === targetUserId)
            ) {
                membershipRole = "moderator";
            }

            return {
                _id: g._id,
                name: g.name,
                description: g.description,
                type: g.type,
                city: g.city,
                location: g.location,
                visibility: g.visibility,
                isInviteOnly: g.isInviteOnly,
                tags: g.tags,
                membershipRole,
                createdAt: g.createdAt,
                updatedAt: g.updatedAt,
            };
        });

        res.json(items);
    },
);


/**
 * @openapi
 * /users/me/stats:
 *   get:
 *     summary: Get aggregate account stats for the authenticated user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Aggregated stats for rides, groups, and driver profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId: { type: string }
 *                 rides:
 *                   type: object
 *                   properties:
 *                     createdTotal:   { type: integer }
 *                     assignedTotal:  { type: integer }
 *                     completedTotal: { type: integer }
 *                 groups:
 *                   type: object
 *                   properties:
 *                     ownerTotal:       { type: integer }
 *                     moderatorTotal:   { type: integer }
 *                     participantTotal: { type: integer }
 *                     total:            { type: integer }
 *                 driver:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     ratingAvg:      { type: number }
 *                     ratingCount:    { type: integer }
 *                     completedRides: { type: integer }
 *                     cancellations:  { type: integer }
 *                     lastActiveAt:   { type: string, format: date-time, nullable: true }
 *       401:
 *         description: Unauthorized
 */
router.get("/me/stats", requireAuth, async (req: Request, res: Response) => {
    const me = (req as any).user as { id: string; roles: string[] };
    const userId = new Types.ObjectId(me.id);

    const [
        createdRidesTotal,
        assignedRidesTotal,
        completedRidesTotal,
        ownerTotal,
        moderatorTotal,
        participantTotal,
        driverDetails,
    ] = await Promise.all([
        Ride.countDocuments({ creatorId: userId }),
        Ride.countDocuments({ assignedDriverId: userId }),
        Ride.countDocuments({ assignedDriverId: userId, status: "completed" }),
        Group.countDocuments({ ownerId: userId }),
        Group.countDocuments({ moderators: userId }),
        Group.countDocuments({ participants: userId }),
        DriverDetails.findOne({ userId }).select({ stats: 1 }).lean(),
    ]);

    const groupsTotal = ownerTotal + moderatorTotal + participantTotal;

    const driverStats = driverDetails?.stats
        ? {
            ratingAvg: driverDetails.stats.ratingAvg ?? null,
            ratingCount: driverDetails.stats.ratingCount ?? 0,
            completedRides: driverDetails.stats.completedRides ?? 0,
            cancellations: driverDetails.stats.cancellations ?? 0,
            lastActiveAt: driverDetails.stats.lastActiveAt ?? null,
        }
        : null;

    res.json({
        userId: me.id,
        rides: {
            createdRidesTotal,
            assignedRidesTotal,
            completedRidesTotal,
        },
        groups: {
            ownerTotal,
            moderatorTotal,
            participantTotal,
            total: groupsTotal,
        },
        driver: driverStats,
    });
});

/**
 * @openapi
 * /users/me/achievements:
 *   get:
 *     summary: List computed achievements for the authenticated user
 *     description: >
 *       Returns a derived list of simple achievements based on driver stats and group membership.
 *       This implementation is purely computed; no persistent achievement storage is used.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of achievements
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:          { type: string }
 *                   title:       { type: string }
 *                   description: { type: string }
 *                   unlocked:    { type: boolean }
 *                   progress:
 *                     type: number
 *                     description: Value in range [0,1] indicating progress towards unlocking
 *       401:
 *         description: Unauthorized
 */
router.get("/me/achievements", requireAuth, async (req: Request, res: Response) => {
    const me = (req as any).user as { id: string; roles: string[] };
    const userId = new Types.ObjectId(me.id);

    const [driverDetails, groupsCount] = await Promise.all([
        DriverDetails.findOne({ userId }).select({ stats: 1 }).lean(),
        Group.countDocuments({
            $or: [{ ownerId: userId }, { moderators: userId }, { participants: userId }],
        }),
    ]);

    const stats = driverDetails?.stats || {};
    const completedRides = stats.completedRides ?? 0;
    const ratingAvg = stats.ratingAvg ?? 0;
    const ratingCount = stats.ratingCount ?? 0;

    const achievements = [
        {
            id: "first_ride",
            title: "First Ride",
            description: "Complete your first ride as a driver.",
            unlocked: completedRides >= 1,
            progress: Math.min(1, completedRides / 1),
        },
        {
            id: "ten_rides",
            title: "On the Road",
            description: "Complete 10 rides as a driver.",
            unlocked: completedRides >= 10,
            progress: Math.min(1, completedRides / 10),
        },
        {
            id: "five_star_driver",
            title: "Five-Star Driver",
            description: "Maintain a 4.8+ rating with at least 10 reviews.",
            unlocked: ratingAvg >= 4.8 && ratingCount >= 10,
            progress: Math.min(1, ratingCount / 10),
        },
        {
            id: "group_member",
            title: "Community Member",
            description: "Join at least one group.",
            unlocked: groupsCount >= 1,
            progress: Math.min(1, groupsCount / 1),
        },
    ];

    res.json(achievements);
});



export default router;

/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         name: { type: string }
 *         email: { type: string }
 *         phone: { type: string }
 *         roles:
 *           type: array
 *           items: { type: string, enum: [driver, dispatcher, client, admin] }
 *         referralCode: { type: string }
 *         emailVerified: { type: boolean }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 */
