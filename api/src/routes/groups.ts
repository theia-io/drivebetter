import { Router, Request, Response } from "express";
import { Types } from "mongoose";
import crypto from "crypto";

import { requireAuth, requireRole } from "../lib/auth";
import Group, { IGroup, GroupVisibility, GroupType } from "../models/group.model";
import { GroupInvite } from "../models/groupInvite.model";
import Ride from "../models/ride.model";
import RideGroupShare from "../models/rideGroupShare.model";
import { RideClaim } from "../models/rideClaim.model";
import User from "../models/user.model";

const router = Router();

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function parsePagination(q: Request["query"]) {
    const page = Math.max(1, Number(q.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(q.limit ?? 20)));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}

function normalizeId(id: any): Types.ObjectId {
    if (!id) {
        throw new Error("normalizeId: id is required");
    }

    if (id instanceof Types.ObjectId) {
        return id;
    }

    if (typeof id === "string") {
        return new Types.ObjectId(id);
    }

    if (typeof id === "object" && (id as any)._id) {
        return normalizeId((id as any)._id);
    }

    throw new Error(`normalizeId: unsupported id value: ${JSON.stringify(id)}`);
}

function userHasAdminRole(req: Request): boolean {
    const roles: string[] = ((req as any).user?.roles) ?? [];
    return roles.includes("admin") || roles.includes("dispatcher");
}

function userIsOwner(group: IGroup, userId: Types.ObjectId | string): boolean {
    const uid = normalizeId(userId);
    return normalizeId(group.ownerId).equals(uid);
}

function userIsModerator(group: IGroup, userId: Types.ObjectId | string): boolean {
    const uid = normalizeId(userId);
    return (group.moderators ?? []).some((m) => normalizeId(m).equals(uid));
}

function userInGroup(group: any, userId: Types.ObjectId | string): boolean {
    const uid = normalizeId(userId);

    if (group.ownerId && normalizeId(group.ownerId).equals(uid)) return true;

    if (
        Array.isArray(group.moderators) &&
        group.moderators.some((m: any) => normalizeId(m).equals(uid))
    ) {
        return true;
    }

    if (
        Array.isArray(group.participants) &&
        group.participants.some((p: any) => normalizeId(p).equals(uid))
    ) {
        return true;
    }

    // compatibility with old data
    if (
        Array.isArray(group.members) &&
        group.members.some((m: any) => normalizeId(m).equals(uid))
    ) {
        return true;
    }

    return false;
}

/**
 * canUserManageGroup:
 *  - admin or dispatcher
 *  - OR group owner
 *
 * hard admin:
 *  - delete group
 *  - manage moderators
 *  - transfer ownership
 */
function canUserManageGroup(group: IGroup, req: Request): boolean {
    const userId = (req as any).user?.id;
    if (!userId) return false;
    if (userHasAdminRole(req)) return true;
    return userIsOwner(group, userId);
}

/**
 * canUserModerateGroup:
 *  - admin or dispatcher
 *  - OR owner
 *  - OR moderator
 *
 * soft admin:
 *  - edit group info
 *  - manage participants
 *  - create invites
 */
function canUserModerateGroup(group: IGroup, req: Request): boolean {
    const userId = (req as any).user?.id;
    if (!userId) return false;
    if (userHasAdminRole(req)) return true;
    if (userIsOwner(group, userId)) return true;
    if (userIsModerator(group, userId)) return true;
    return false;
}

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type CreateGroupBody = {
    name: string;
    description?: string;
    type?: GroupType;
    city?: string;
    location?: string;
    visibility?: GroupVisibility;
    isInviteOnly?: boolean;
    tags?: string[];
    rules?: string;
};

type UpdateGroupBody = Partial<CreateGroupBody>;

/* -------------------------------------------------------------------------- */
/* List groups                                                                */
/* -------------------------------------------------------------------------- */

/**
 * @openapi
 * /groups:
 *   get:
 *     summary: List groups visible to current user
 *     tags: [Groups]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [fleet, coop, airport, city, custom, global]
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: visibility
 *         schema:
 *           type: string
 *           enum: [public, private, restricted]
 *       - in: query
 *         name: isInviteOnly
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Paged groups
 *     security:
 *       - bearerAuth: []
 */
router.get("/", requireAuth, async (req: Request, res: Response) => {
    const { q, type, city, visibility, isInviteOnly } = req.query as Record<
        string,
        string | undefined
    >;
    const { page, limit, skip } = parsePagination(req.query);

    const rawUserId = (req as any).user?._id || (req as any).user?.id;
    if (!rawUserId) {
        return res.status(401).json({ error: "Unauthenticated" });
    }
    const userId = new Types.ObjectId(rawUserId);
    const isAdmin = userHasAdminRole(req);

    const filter: any = {};

    // Admin/dispatcher: see all groups
    // Non-admin: only groups where user is owner/mod/participant/legacy member
    if (!isAdmin) {
        filter.$or = [
            { ownerId: userId },
            { moderators: userId },
            { participants: userId },
            { members: userId }, // legacy
        ];
    }

    if (type) filter.type = type;
    if (city) filter.city = new RegExp(city, "i");
    if (visibility) filter.visibility = visibility;
    if (typeof isInviteOnly === "string") {
        if (isInviteOnly === "true") filter.isInviteOnly = true;
        if (isInviteOnly === "false") filter.isInviteOnly = false;
    }

    if (q) {
        filter.$text = { $search: q };
    }

    const [items, total] = await Promise.all([
        Group.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Group.countDocuments(filter),
    ]);

    const pages = Math.max(1, Math.ceil(total / limit));

    res.json({ items, page, limit, total, pages });
});

/* -------------------------------------------------------------------------- */
/* Create group                                                               */
/* -------------------------------------------------------------------------- */

/**
 * @openapi
 * /groups:
 *   post:
 *     summary: Create a new group
 *     tags: [Groups]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               type:
 *                 type: string
 *                 enum: [fleet, coop, airport, city, custom, global]
 *               city: { type: string }
 *               location: { type: string }
 *               visibility:
 *                 type: string
 *                 enum: [public, private, restricted]
 *               isInviteOnly: { type: boolean }
 *               tags:
 *                 type: array
 *                 items: { type: string }
 *               rules: { type: string }
 *     responses:
 *       201: { description: Created }
 *     security:
 *       - bearerAuth: []
 */
router.post(
    "/",
    requireAuth,
    requireRole(["admin", "dispatcher", "driver"]),
    async (req: Request, res: Response) => {
        try {
            const body = req.body as CreateGroupBody;
            if (!body.name || typeof body.name !== "string") {
                return res.status(400).json({ error: "name is required" });
            }

            const userId = new Types.ObjectId((req as any).user.id);

            const group = await Group.create({
                name: body.name.trim(),
                description: body.description?.trim() || undefined,
                type: body.type ?? "custom",
                city: body.city?.trim() || undefined,
                location: body.location?.trim() || undefined,
                visibility: body.visibility ?? "private",
                isInviteOnly:
                    typeof body.isInviteOnly === "boolean" ? body.isInviteOnly : true,
                tags: body.tags ?? [],
                rules: body.rules ?? "",
                ownerId: userId,
                moderators: [],
                participants: [userId],
            });

            res.status(201).json(group);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    }
);

/* -------------------------------------------------------------------------- */
/* Get group                                                                  */
/* -------------------------------------------------------------------------- */

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
 *       200: { description: Group }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 *     security:
 *       - bearerAuth: []
 */
router.get(
    "/:id([0-9a-fA-F]{24})",
    requireAuth,
    async (req: Request, res: Response) => {
        const group = await Group.findById(req.params.id).lean<IGroup | null>();
        if (!group) return res.status(404).json({ error: "Group not found" });

        const userId = (req as any).user?.id;
        // Invite-only: only members can access
        if (!canUserManageGroup(group, req) && (!userId || !userInGroup(group, userId))) {
            return res
                .status(403)
                .json({ error: "Access denied: invite only group" });
        }

        res.json(group);
    }
);

/* -------------------------------------------------------------------------- */
/* Update group                                                               */
/* -------------------------------------------------------------------------- */

/**
 * @openapi
 * /groups/{id}:
 *   patch:
 *     summary: Update group
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
 *               name: { type: string }
 *               description: { type: string }
 *               type:
 *                 type: string
 *                 enum: [fleet, coop, airport, city, custom, global]
 *               city: { type: string }
 *               location: { type: string }
 *               visibility:
 *                 type: string
 *                 enum: [public, private, restricted]
 *               isInviteOnly: { type: boolean }
 *               tags:
 *                 type: array
 *                 items: { type: string }
 *               rules: { type: string }
 *     responses:
 *       200: { description: Updated }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 *     security:
 *       - bearerAuth: []
 */
router.patch(
    "/:id([0-9a-fA-F]{24})",
    requireAuth,
    async (req: Request, res: Response) => {
        try {
            const body = req.body as UpdateGroupBody;
            const group = await Group.findById(req.params.id);
            if (!group) return res.status(404).json({ error: "Group not found" });

            if (!canUserModerateGroup(group, req)) {
                return res.status(403).json({ error: "Access denied" });
            }

            if (body.name !== undefined) group.name = body.name.trim();
            if (body.description !== undefined)
                group.description = body.description.trim();
            if (body.type !== undefined) group.type = body.type;
            if (body.city !== undefined) group.city = body.city.trim();
            if (body.location !== undefined)
                group.location = body.location.trim();
            if (body.visibility !== undefined) group.visibility = body.visibility;
            if (body.isInviteOnly !== undefined)
                group.isInviteOnly = body.isInviteOnly;
            if (body.tags !== undefined) group.tags = body.tags;
            if (body.rules !== undefined) group.rules = body.rules;

            await group.save();
            res.json(group);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    }
);

/* -------------------------------------------------------------------------- */
/* Delete group                                                               */
/* -------------------------------------------------------------------------- */

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
 *       204: { description: Deleted }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 *     security:
 *       - bearerAuth: []
 */
router.delete(
    "/:id([0-9a-fA-F]{24})",
    requireAuth,
    async (req: Request, res: Response) => {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ error: "Group not found" });

        if (!canUserManageGroup(group, req)) {
            return res
                .status(403)
                .json({ error: "Only owner or admin/dispatcher can delete" });
        }

        await group.deleteOne();
        res.status(204).send();
    }
);

/* -------------------------------------------------------------------------- */
/* Membership + moderators management                                         */
/* -------------------------------------------------------------------------- */

/**
 * @openapi
 * /groups/{id}/members:
 *   get:
 *     summary: Get group membership info
 *     tags: [Groups]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 *     security:
 *       - bearerAuth: []
 */
router.get(
    "/:id([0-9a-fA-F]{24})/members",
    requireAuth,
    async (req: Request, res: Response) => {
        const group = await Group.findById(req.params.id)
            .populate("ownerId", "name email")
            .populate("moderators", "name email")
            .populate("participants", "name email")
            .lean<IGroup & any | null>();

        if (!group) return res.status(404).json({ error: "Group not found" });

        const userId = (req as any).user?.id;
        // Only group members can see membership info
        if (!canUserManageGroup(group, req) && (!userId || !userInGroup(group, userId)) ) {
            return res.status(403).json({ error: "Access denied" });
        }

        res.json({
            owner: group.ownerId,
            moderators: group.moderators,
            participants: group.participants,
        });
    }
);

/**
 * @openapi
 * /groups/{id}/participants:
 *   post:
 *     summary: Add a participant to group
 *     tags: [Groups]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId: { type: string }
 *     responses:
 *       200: { description: OK }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 *     security:
 *       - bearerAuth: []
 */
router.post(
    "/:id([0-9a-fA-F]{24})/participants",
    requireAuth,
    async (req: Request, res: Response) => {
        const { userId } = req.body as { userId?: string };
        if (!userId) return res.status(400).json({ error: "userId is required" });

        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ error: "Group not found" });

        if (!canUserModerateGroup(group, req)) {
            return res.status(403).json({ error: "Access denied" });
        }

        const uid = new Types.ObjectId(userId);

        // do not add owner as participant here
        if (!group.participants.some((p) => p.equals(uid))) {
            group.participants.push(uid);
        }

        await group.save();
        res.json(group);
    }
);

/**
 * @openapi
 * /groups/{id}/participants/{userId}:
 *   delete:
 *     summary: Remove a participant from group
 *     tags: [Groups]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 *     security:
 *       - bearerAuth: []
 */
router.delete(
    "/:id([0-9a-fA-F]{24})/participants/:userId([0-9a-fA-F]{24})",
    requireAuth,
    async (req: Request, res: Response) => {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ error: "Group not found" });

        if (!canUserModerateGroup(group, req)) {
            return res.status(403).json({ error: "Access denied" });
        }

        const targetId = new Types.ObjectId(req.params.userId);
        // cannot remove owner here
        if (normalizeId(group.ownerId).equals(targetId)) {
            return res
                .status(400)
                .json({ error: "Cannot remove owner as participant" });
        }

        group.participants = group.participants.filter(
            (p) => !normalizeId(p).equals(targetId)
        );

        await group.save();
        res.json(group);
    }
);

/**
 * @openapi
 * /groups/{id}/moderators:
 *   post:
 *     summary: Add a moderator
 *     tags: [Groups]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId: { type: string }
 *     responses:
 *       200: { description: OK }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 *     security:
 *       - bearerAuth: []
 */
router.post(
    "/:id([0-9a-fA-F]{24})/moderators",
    requireAuth,
    async (req: Request, res: Response) => {
        const { userId } = req.body as { userId?: string };
        if (!userId) return res.status(400).json({ error: "userId is required" });

        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ error: "Group not found" });

        if (!canUserManageGroup(group, req)) {
            return res.status(403).json({
                error: "Only owner or admin/dispatcher can manage moderators",
            });
        }

        const uid = new Types.ObjectId(userId);

        // owner is top-level; don't add owner as moderator
        if (!normalizeId(group.ownerId).equals(uid)) {
            if (!group.moderators.some((m) => m.equals(uid))) {
                group.moderators.push(uid);
            }
        }

        await group.save();
        res.json(group);
    }
);

/**
 * @openapi
 * /groups/{id}/moderators/{userId}:
 *   delete:
 *     summary: Remove a moderator
 *     tags: [Groups]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 *     security:
 *       - bearerAuth: []
 */
router.delete(
    "/:id([0-9a-fA-F]{24})/moderators/:userId([0-9a-fA-F]{24})",
    requireAuth,
    async (req: Request, res: Response) => {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ error: "Group not found" });

        if (!canUserManageGroup(group, req)) {
            return res.status(403).json({
                error: "Only owner or admin/dispatcher can manage moderators",
            });
        }

        const targetId = new Types.ObjectId(req.params.userId);
        // cannot remove owner as moderator (owner is separate)
        if (normalizeId(group.ownerId).equals(targetId)) {
            return res
                .status(400)
                .json({ error: "Owner is not a removable moderator" });
        }

        group.moderators = group.moderators.filter(
            (m) => !normalizeId(m).equals(targetId)
        );

        await group.save();
        res.json(group);
    }
);

/**
 * @openapi
 * /groups/{id}/leave:
 *   post:
 *     summary: Current user leaves the group
 *     tags: [Groups]
 *     responses:
 *       200: { description: OK }
 *       400: { description: Cannot leave as owner }
 *       404: { description: Not found }
 *     security:
 *       - bearerAuth: []
 */
router.post(
    "/:id([0-9a-fA-F]{24})/leave",
    requireAuth,
    async (req: Request, res: Response) => {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ error: "Group not found" });

        const userId = new Types.ObjectId((req as any).user.id);

        if (normalizeId(group.ownerId).equals(userId)) {
            return res.status(400).json({
                error:
                    "Owner cannot leave the group. Transfer ownership or delete group.",
            });
        }

        group.moderators = group.moderators.filter(
            (m) => !normalizeId(m).equals(userId)
        );
        group.participants = group.participants.filter(
            (p) => !normalizeId(p).equals(userId)
        );

        await group.save();
        res.json({ ok: true });
    }
);

/**
 * @openapi
 * /groups/{id}/owner:
 *   post:
 *     summary: Transfer group ownership
 *     tags: [Groups]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId: { type: string }
 *     responses:
 *       200: { description: OK }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 *     security:
 *       - bearerAuth: []
 */
router.post(
    "/:id([0-9a-fA-F]{24})/owner",
    requireAuth,
    async (req: Request, res: Response) => {
        const { userId } = req.body as { userId?: string };
        if (!userId) return res.status(400).json({ error: "userId is required" });

        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ error: "Group not found" });

        if (!canUserManageGroup(group, req)) {
            return res.status(403).json({
                error: "Only owner or admin/dispatcher can transfer ownership",
            });
        }

        const newOwnerId = new Types.ObjectId(userId);
        group.ownerId = newOwnerId;

        // Ensure new owner is at least a participant; pre-save hook will sync members
        if (!group.participants.some((p) => p.equals(newOwnerId))) {
            group.participants.push(newOwnerId);
        }

        await group.save();
        res.json(group);
    }
);

/* -------------------------------------------------------------------------- */
/* Invites                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * @openapi
 * /groups/{id}/invites:
 *   post:
 *     summary: Create invite code for a group
 *     tags: [Groups]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201: { description: Created }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 *     security:
 *       - bearerAuth: []
 */
router.post(
    "/:id([0-9a-fA-F]{24})/invites",
    requireAuth,
    async (req: Request, res: Response) => {
        const groupId = new Types.ObjectId(req.params.id);
        const { expiresAt } = req.body as { expiresAt?: string };

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ error: "Group not found" });

        if (!canUserModerateGroup(group, req)) {
            return res.status(403).json({ error: "Access denied" });
        }

        const code = crypto.randomUUID().replace(/-/g, "").slice(0, 12);

        const invite = await GroupInvite.create({
            groupId,
            code,
            createdBy: (req as any).user.id,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
        });

        res.status(201).json({
            code: invite.code,
            groupId: invite.groupId,
            expiresAt: invite.expiresAt,
        });
    }
);

/**
 * @openapi
 * /groups/join:
 *   post:
 *     summary: Join a group by invite code
 *     tags: [Groups]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string }
 *     responses:
 *       200: { description: Joined }
 *       400: { description: Invalid or expired invite }
 *     security:
 *       - bearerAuth: []
 */
router.post("/join", requireAuth, async (req: Request, res: Response) => {
    const { code } = req.body as { code?: string };
    if (!code) return res.status(400).json({ error: "Code is required" });

    const invite = await GroupInvite.findOne({ code }).lean();
    if (!invite) return res.status(400).json({ error: "Invalid invite" });

    if (invite.expiresAt && invite.expiresAt < new Date()) {
        return res.status(400).json({ error: "Invite expired" });
    }
    if ((invite as any).usedBy) {
        return res.status(400).json({ error: "Invite already used" });
    }

    const group = await Group.findById(invite.groupId);
    if (!group) return res.status(400).json({ error: "Group not found" });

    const userId = new Types.ObjectId((req as any).user.id);

    if (!group.participants.some((p) => p.equals(userId))) {
        group.participants.push(userId);
        await group.save();
    }

    await GroupInvite.updateOne(
        { _id: (invite as any)._id },
        { $set: { usedBy: userId, usedAt: new Date() } }
    );

    res.json({
        ok: true,
        group: {
            _id: group._id,
            name: group.name,
            type: group.type,
        },
    });
});

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * @openapi
 * /groups/{id}/dashboard:
 *   get:
 *     summary: Group dashboard with drivers and rides
 *     tags: [Groups]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 *     security:
 *       - bearerAuth: []
 */
router.get(
    "/:id([0-9a-fA-F]{24})/dashboard",
    requireAuth,
    async (req: Request, res: Response) => {
        const groupId = new Types.ObjectId(req.params.id);
        const userId = new Types.ObjectId((req as any).user.id);

        const group = await Group.findById(groupId).lean<IGroup | null>();
        if (!group) return res.status(404).json({ error: "Group not found" });

        // Only group members can see dashboard
        if (!canUserManageGroup(group, req) && !userInGroup(group, userId)) {
            return res.status(403).json({ error: "Access denied" });
        }

        const memberIds: Types.ObjectId[] = (group.members ?? []).map((m: any) =>
            new Types.ObjectId(m)
        );

        // Drivers (profiles) = all members
        const drivers = await User.find(
            { _id: { $in: memberIds } },
            { password: 0 }
        )
            .lean()
            .exec();

        // Rides linked to this group via RideGroupShare
        const shares = await RideGroupShare.find({ groupId }).lean();
        const rideIdsFromShares = shares.map((s: any) => s.rideId);

        const activeStatuses = ["assigned", "on_my_way", "on_location", "pob", "clear"];

        const [activeAssigned, activeUnassigned, history, claims] = await Promise.all(
            [
                // active rides assigned to group members
                Ride.find({
                    _id: { $in: rideIdsFromShares },
                    assignedDriverId: { $in: memberIds },
                    status: { $in: activeStatuses },
                })
                    .sort({ datetime: 1 })
                    .lean(),

                // active unassigned rides in this group
                Ride.find({
                    _id: { $in: rideIdsFromShares },
                    status: "unassigned",
                })
                    .sort({ datetime: 1 })
                    .lean(),

                // history = completed rides for this group
                Ride.find({
                    _id: { $in: rideIdsFromShares },
                    status: "completed",
                })
                    .sort({ datetime: -1 })
                    .limit(100)
                    .lean(),

                // ride requests (claims) from group members on rides shared with this group
                RideClaim.find({
                    driverId: { $in: memberIds },
                    rideId: { $in: rideIdsFromShares },
                })
                    .sort({ createdAt: -1 })
                    .limit(200)
                    .lean(),
            ]
        );

        const claimRideIds = Array.from(
            new Set(claims.map((c: any) => String(c.rideId)))
        ).map((id) => new Types.ObjectId(id));
        const claimDriverIds = Array.from(
            new Set(claims.map((c: any) => String(c.driverId)))
        ).map((id) => new Types.ObjectId(id));

        const [claimRides, claimDrivers] = await Promise.all([
            Ride.find(
                { _id: { $in: claimRideIds } },
                { from: 1, to: 1, status: 1, datetime: 1 }
            ).lean(),
            User.find(
                { _id: { $in: claimDriverIds } },
                { name: 1, email: 1 }
            ).lean(),
        ]);

        const claimRideMap = new Map(
            claimRides.map((r: any) => [String(r._id), r])
        );
        const claimDriverMap = new Map(
            claimDrivers.map((d: any) => [String(d._id), d])
        );

        const claimsWithDetails = claims.map((c: any) => ({
            ...c,
            ride: claimRideMap.get(String(c.rideId)) || null,
            driver: claimDriverMap.get(String(c.driverId)) || null,
        }));

        res.json({
            group: {
                _id: group._id,
                name: group.name,
                type: group.type,
                city: group.city,
                visibility: group.visibility,
                isInviteOnly: group.isInviteOnly,
                tags: group.tags,
                rules: group.rules,
                ownerId: group.ownerId,
            },
            drivers,
            rides: {
                activeAssigned,
                activeUnassigned,
                history,
            },
            rideRequests: claimsWithDetails,
        });
    }
);

export default router;
