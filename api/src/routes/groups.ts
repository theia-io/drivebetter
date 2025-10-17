import { Router, Request, Response } from "express";
import { Types } from "mongoose";
import { requireAuth, requireRole } from "../lib/auth";
import Group from "../models/group.model";


function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Partial<T> {
    const out: Partial<T> = {};
    keys.forEach((k) => {
        if (obj[k] !== undefined) (out as any)[k] = obj[k];
    });
    return out;
}

function parsePagination(q: Request["query"]) {
    const page = Math.max(1, Number(q.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(q.limit ?? 20)));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}

/* -------------------------------- Router -------------------------------- */
const router = Router();

/**
 * @openapi
 * /groups:
 *   get:
 *     summary: List groups
 *     tags: [Groups]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Full-text search on name/city (case-insensitive)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [local, corporate, global]
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Paged groups
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                 page: { type: integer }
 *                 limit: { type: integer }
 *                 total: { type: integer }
 *                 pages: { type: integer }
 */
router.get("/", requireAuth, async (req: Request, res: Response) => {
    const { q, type, city } = req.query as Record<string, string | undefined>;
    const { page, limit, skip } = parsePagination(req.query);

    const filter: any = {};
    if (type) filter.type = type;
    if (city) filter.city = new RegExp(`^${city}$`, "i");
    if (q && q.trim()) {
        const rx = new RegExp(q.trim(), "i");
        filter.$or = [{ name: rx }, { city: rx }];
    }

    const [items, total] = await Promise.all([
        Group.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Group.countDocuments(filter),
    ]);
    res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
});

/**
 * @openapi
 * /groups:
 *   post:
 *     summary: Create group
 *     tags: [Groups]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateGroupRequest'
 *     responses:
 *       201: { description: Created }
 *       400: { description: Validation error }
 *     security:
 *       - bearerAuth: []
 */
router.post("/", requireAuth, requireRole(["admin", "dispatcher"]), async (req: Request, res: Response) => {
    try {
        const { name, type, description, city, location, visibility, isInviteOnly, tags } = req.body;
        const group = await Group.create({
            name,
            type,
            description,
            city,
            location,
            visibility,         // optional; defaults in schema
            isInviteOnly,       // optional; defaults in schema
            tags,               // optional; normalized by schema setter
            members: [],
        });
        res.status(201).json(group);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /groups/{id}:
 *   get:
 *     summary: Get group by ID
 *     tags: [Groups]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 */
router.get("/:id([0-9a-fA-F]{24})", requireAuth, async (req: Request, res: Response) => {
    const doc = await Group.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
});

/**
 * @openapi
 * /groups/{id}:
 *   patch:
 *     summary: Update group (partial)
 *     tags: [Groups]
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
 *             $ref: '#/components/schemas/UpdateGroupRequest'
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 *     security:
 *       - bearerAuth: []
 */
router.patch("/:id([0-9a-fA-F]{24})", requireAuth, requireRole(["admin","dispatcher"]), async (req, res) => {
    try {
        const { name, type, description, city, location, visibility, isInviteOnly, tags } = req.body;

        const updated = await Group.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    ...(name !== undefined && { name }),
                    ...(type !== undefined && { type }),
                    ...(description !== undefined && { description }),
                    ...(city !== undefined && { city }),
                    ...(location !== undefined && { location }),
                    ...(visibility !== undefined && { visibility }),
                    ...(isInviteOnly !== undefined && { isInviteOnly }),
                    ...(tags !== undefined && { tags }),
                },
            },
            { new: true, runValidators: true }
        ).lean();

        if (!updated) return res.status(404).json({ error: "Not found" });
        res.json(updated);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});


/**
 * @openapi
 * /groups/{id}:
 *   delete:
 *     summary: Delete group
 *     tags: [Groups]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 *       404: { description: Not found }
 *     security:
 *       - bearerAuth: []
 */
router.delete("/:id([0-9a-fA-F]{24})", requireAuth, requireRole(["admin"]), async (req: Request, res: Response) => {
    const doc = await Group.findByIdAndDelete(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
});

/**
 * @openapi
 * /groups/{id}/members:
 *   get:
 *     summary: Get group members
 *     tags: [Groups]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Members list (user IDs)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 members:
 *                   type: array
 *                   items: { type: string }
 *       404: { description: Not found }
 */
router.get("/:id([0-9a-fA-F]{24})/members", requireAuth, async (req: Request, res: Response) => {
    const doc = await Group.findById(req.params.id).select({ members: 1 }).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json({ members: (doc.members || []).map(String) });
});

/**
 * @openapi
 * /groups/{id}/members:
 *   post:
 *     summary: Add or remove members
 *     tags: [Groups]
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
 *               add:
 *                 type: array
 *                 items: { type: string }
 *               remove:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 *     security:
 *       - bearerAuth: []
 */
router.post("/:id([0-9a-fA-F]{24})/members", requireAuth, requireRole(["admin", "dispatcher"]), async (req: Request, res: Response) => {
    const { add = [], remove = [] } = req.body as { add?: string[]; remove?: string[] };

    // validate ids
    const toAdd = (Array.isArray(add) ? add : []).filter((x) => Types.ObjectId.isValid(x)).map((x) => new Types.ObjectId(x));
    const toRemove = (Array.isArray(remove) ? remove : []).filter((x) => Types.ObjectId.isValid(x)).map((x) => new Types.ObjectId(x));

    const doc = await Group.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });

    if (toAdd.length) {
        // ensure uniqueness
        const current = new Set(doc.members.map((m) => String(m)));
        toAdd.forEach((id) => {
            if (!current.has(String(id))) doc.members.push(id);
        });
    }
    if (toRemove.length) {
        const removeSet = new Set(toRemove.map(String));
        doc.members = doc.members.filter((m) => !removeSet.has(String(m)));
    }
    await doc.save();
    res.json({ members: doc.members.map(String) });
});

/**
 * @openapi
 * /groups/{id}/join:
 *   post:
 *     summary: Join a group
 *     description: Adds the authenticated user to the group's members list. Idempotent if already a member.
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Group ID
 *     responses:
 *       200:
 *         description: Joined group (updated group document)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Group'
 *       401:
 *         description: Unauthorized (missing/invalid token)
 *       404:
 *         description: Group not found
 */
router.post("/:id([0-9a-fA-F]{24})/join", requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthenticated" });

        const updated = await Group.findByIdAndUpdate(
            req.params.id,
            { $addToSet: { members: userId } },
            { new: true }
        ).lean();

        if (!updated) return res.status(404).json({ error: "Not found" });

        return res.json(updated);
    } catch (err: any) {
        return res.status(400).json({ error: err.message || "Failed to join group" });
    }
});

/**
 * @openapi
 * components:
 *   schemas:
 *     Group:
 *       type: object
 *       properties:
 *         _id:         { type: string }
 *         name:        { type: string }
 *         description: { type: string }
 *         type:
 *           type: string
 *           enum: [fleet, coop, airport, city, custom]
 *         city:        { type: string }
 *         location:    { type: string }
 *         visibility:
 *           type: string
 *           enum: [public, private, restricted]
 *           description: Group discoverability / listing scope
 *         isInviteOnly:
 *           type: boolean
 *           description: If true, only invited users can join
 *         tags:
 *           type: array
 *           items: { type: string }
 *         members:
 *           type: array
 *           items: { type: string }
 *         createdAt:   { type: string, format: date-time }
 *         updatedAt:   { type: string, format: date-time }
 *
 *     CreateGroupRequest:
 *       type: object
 *       required: [name, type]
 *       properties:
 *         name:        { type: string }
 *         type:
 *           type: string
 *           enum: [fleet, coop, airport, city, custom]
 *         description: { type: string }
 *         city:        { type: string }
 *         location:    { type: string }
 *         visibility:
 *           type: string
 *           enum: [public, private, restricted]
 *           default: private
 *         isInviteOnly:
 *           type: boolean
 *           default: false
 *         tags:
 *           type: array
 *           items: { type: string }
 *
 *     UpdateGroupRequest:
 *       type: object
 *       properties:
 *         name:        { type: string }
 *         type:
 *           type: string
 *           enum: [fleet, coop, airport, city, custom]
 *         description: { type: string }
 *         city:        { type: string }
 *         location:    { type: string }
 *         visibility:
 *           type: string
 *           enum: [public, private, restricted]
 *         isInviteOnly:
 *           type: boolean
 *         tags:
 *           type: array
 *           items: { type: string }
 *
 *     GroupMembersPatchBody:
 *       type: object
 *       description: Add/remove members in one request.
 *       properties:
 *         add:
 *           type: array
 *           items:
 *             type: string
 *           description: User IDs to add.
 *           example: ["665f2c11f9a1a72d9b0f1d03", "665f2c11f9a1a72d9b0f1d04"]
 *         remove:
 *           type: array
 *           items:
 *             type: string
 *           description: User IDs to remove.
 *           example: ["665f2c11f9a1a72d9b0f1d05"]
 *
 *     GroupListResponse:
 *       type: object
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Group'
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 20
 *         total:
 *           type: integer
 *           example: 57
 *         pages:
 *           type: integer
 *           example: 3
 */

export default router;
