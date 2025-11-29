import crypto from "crypto";
import { Request, Response, Router } from "express";
import { Types } from "mongoose";

import { pick } from "next/dist/lib/pick";
import {getCurrentUser, requireAuth, requireRole, userHasAdminRole} from "../lib/auth";
import { sendPushNotificationToUser, sendPushNotificationToUsers } from "../lib/pushNotifications";
import { GroupInvite } from "../models/groupInvite.model";
import { Group } from "../models/group.model";
import Ride from "../models/ride.model";
import { RideClaim } from "../models/rideClaim.model";
import { RideShare } from "../models/rideShare.model";
import User from "../models/user.model";

const router = Router();

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */
function parsePagination(query: any) {
    const page = Math.max(parseInt(query.page as string, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit as string, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}

function userInGroupDoc(doc: any, userId: Types.ObjectId): boolean {
    const uid = userId.toString();

    if (doc.ownerId && String(doc.ownerId) === uid) return true;

    if (Array.isArray(doc.moderators) && doc.moderators.some((id: any) => String(id) === uid)) {
        return true;
    }

    if (Array.isArray(doc.participants) && doc.participants.some((id: any) => String(id) === uid)) {
        return true;
    }

    return false;
}

function canUserManageGroup(req: Request, group: any): boolean {
    const { id: rawUserId } = getCurrentUser(req);
    if (!rawUserId) return false;
    const uid = String(rawUserId);
    if (userHasAdminRole(req)) return true;
    return group.ownerId && String(group.ownerId) === uid;
}

function canUserModerateGroup(req: Request, group: any): boolean {
    const { id: rawUserId } = getCurrentUser(req);
    if (!rawUserId) return false;
    const uid = String(rawUserId);
    if (userHasAdminRole(req)) return true;
    if (group.ownerId && String(group.ownerId) === uid) return true;
    if (Array.isArray(group.moderators) && group.moderators.some((id: any) => String(id) === uid)) {
        return true;
    }
    return false;
}

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

    const { id: rawUserId } = getCurrentUser(req);
    if (!rawUserId) {
        return res.status(401).json({ error: "Unauthenticated" });
    }
    const userId = new Types.ObjectId(rawUserId);
    const isAdmin = userHasAdminRole(req);

    const filter: any = {};

    if (!isAdmin) {
        filter.$or = [
            { ownerId: userId },
            { moderators: userId },
            { participants: userId },
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

    const groupIds = items.map((g: any) => g._id as Types.ObjectId);
    let activeShareGroups = new Set<string>();

    if (groupIds.length > 0) {
        const shares = await RideShare.find(
            {
                visibility: "groups",
                status: "active",
                groupIds: { $in: groupIds },
            },
            { groupIds: 1 },
        ).lean();

        activeShareGroups = new Set<string>();
        for (const s of shares) {
            const gids: any[] = Array.isArray((s as any).groupIds)
                ? (s as any).groupIds
                : [];
            for (const gid of gids) {
                if (gid) activeShareGroups.add(String(gid));
            }
        }
    }

    const itemsWithFlags = items.map((g: any) => ({
        ...g,
        hasActiveShares: activeShareGroups.has(String(g._id)),
    }));

    res.json({ items: itemsWithFlags, page, limit, total, pages });
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
router.post("/", requireAuth, async (req: Request, res: Response) => {
    const { id: rawUserId } = getCurrentUser(req);
    if (!rawUserId) {
        return res.status(401).json({ error: "Unauthenticated" });
    }
    const userId = new Types.ObjectId(rawUserId);

    const {
        name,
        type,
        city,
        location,
        visibility = "private",
        isInviteOnly = true,
        description,
        rules,
        tags,
    } = req.body || {};

    if (!name || typeof name !== "string") {
        return res.status(400).json({ error: "name is required" });
    }

    const group = await Group.create({
        name: name.trim(),
        type: type || "custom",
        city: city || undefined,
        location: location || undefined,
        visibility,
        isInviteOnly,
        description: description || undefined,
        rules: rules || undefined,
        tags: Array.isArray(tags) ? tags : [],
        ownerId: userId,
        moderators: [],
        participants: [userId],
        createdBy: userId,
    });

    res.status(201).json(group);
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
 *       200: { description: Group }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 *     security:
 *       - bearerAuth: []
 */
router.get("/:id([0-9a-fA-F]{24})", requireAuth, async (req: Request, res: Response) => {
    const { id: rawUserId } = getCurrentUser(req);
    if (!rawUserId) {
        return res.status(401).json({ error: "Unauthenticated" });
    }
    const userId = new Types.ObjectId(rawUserId);
    const isAdmin = userHasAdminRole(req);

    const groupId = new Types.ObjectId(req.params.id);

    const group = await Group.findById(groupId).lean();
    if (!group) {
        return res.status(404).json({ error: "Not found" });
    }

    if (!isAdmin && !userInGroupDoc(group, userId)) {
        return res.status(403).json({ error: "forbidden" });
    }

    res.json(group);
});

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
router.patch("/:id([0-9a-fA-F]{24})", requireAuth, async (req: Request, res: Response) => {
    const groupId = new Types.ObjectId(req.params.id);
    const group = await Group.findById(groupId);
    if (!group) {
        return res.status(404).json({ error: "Not found" });
    }

    if (!canUserModerateGroup(req, group)) {
        return res.status(403).json({ error: "forbidden" });
    }

    const {
        name,
        type,
        city,
        location,
        visibility,
        isInviteOnly,
        description,
        rules,
        tags,
    } = req.body || {};

    if (name !== undefined) group.name = String(name).trim();
    if (type !== undefined) group.type = type;
    if (city !== undefined) group.city = city || undefined;
    if (location !== undefined) group.location = location || undefined;
    if (visibility !== undefined) group.visibility = visibility;
    if (isInviteOnly !== undefined) group.isInviteOnly = !!isInviteOnly;
    if (description !== undefined) group.description = description || undefined;
    if (rules !== undefined) group.rules = rules || undefined;
    if (tags !== undefined) {
        group.tags = Array.isArray(tags) ? tags : [];
    }

    await group.save();

    res.json(group.toObject());
});

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
router.delete("/:id([0-9a-fA-F]{24})", requireAuth, async (req: Request, res: Response) => {
    const groupId = new Types.ObjectId(req.params.id);
    const group = await Group.findById(groupId);
    if (!group) {
        return res.status(404).json({ error: "Not found" });
    }

    if (!canUserManageGroup(req, group)) {
        return res.status(403).json({ error: "forbidden" });
    }

    await group.deleteOne();

    res.json({ ok: true });
});

/* -------------------------------------------------------------------------- */
/* Membership + moderators management                                         */
/* -------------------------------------------------------------------------- */

/**
 * @openapi
 * /groups/{id}/participants:
 *   get:
 *     summary: Get group participants info
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
    "/:id([0-9a-fA-F]{24})/participants",
    requireAuth,
    async (req: Request, res: Response) => {
        const { id: rawUserId } = getCurrentUser(req);
        if (!rawUserId) {
            return res.status(401).json({ error: "Unauthenticated" });
        }
        const userId = new Types.ObjectId(rawUserId);
        const isAdmin = userHasAdminRole(req);

        const groupId = new Types.ObjectId(req.params.id);
        const group = await Group.findById(groupId).lean();
        if (!group) {
            return res.status(404).json({ error: "Not found" });
        }

        if (!isAdmin && !userInGroupDoc(group, userId)) {
            return res.status(403).json({ error: "forbidden" });
        }

        const ownerId = group.ownerId ? new Types.ObjectId(group.ownerId) : null;
        const moderatorIds = (group.moderators || []).map((id: any) => new Types.ObjectId(id));
        const participantIds = (group.participants || []).map((id: any) => new Types.ObjectId(id));

        const allIds = new Set<string>();
        if (ownerId) allIds.add(ownerId.toString());
        moderatorIds.forEach((id) => allIds.add(id.toString()));
        participantIds.forEach((id) => allIds.add(id.toString()));

        const userIds = Array.from(allIds).map((id) => new Types.ObjectId(id));

        const users = userIds.length
            ? await User.find(
                { _id: { $in: userIds } },
                { name: 1, email: 1 },
            ).lean()
            : [];

        const userMap: Record<string, any> = {};
        for (const u of users) {
            userMap[String(u._id)] = u;
        }

        res.json({
            owner: ownerId ? userMap[ownerId.toString()] || null : null,
            moderators: moderatorIds.map((id) => userMap[id.toString()]).filter(Boolean),
            participants: participantIds.map((id) => userMap[id.toString()]).filter(Boolean),
        });
    },
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
        const groupId = new Types.ObjectId(req.params.id);
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ error: "Not found" });
        }

        if (!canUserModerateGroup(req, group)) {
            return res.status(403).json({ error: "forbidden" });
        }

        const { userId } = req.body || {};
        if (!userId) {
            return res.status(400).json({ error: "userId is required" });
        }

        const uid = new Types.ObjectId(userId);

        if (!group.participants.some((id) => String(id) === uid.toString())) {
            group.participants.push(uid);
        }

        await group.save();

        res.json(group.toObject());
    },
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
        const groupId = new Types.ObjectId(req.params.id);
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ error: "Not found" });
        }

        const { id: rawUserId } = getCurrentUser(req);
        if (!rawUserId) {
            return res.status(401).json({ error: "Unauthenticated" });
        }

        const uid = new Types.ObjectId(rawUserId);
        const targetId = new Types.ObjectId(req.params.userId);
        const isSelf = uid.toString() === targetId.toString();

        if (!isSelf && !canUserModerateGroup(req, group)) {
            return res.status(403).json({ error: "forbidden" });
        }

        if (group.ownerId && String(group.ownerId) === targetId.toString()) {
            return res.status(400).json({ error: "cannot remove owner from participants" });
        }

        group.participants = group.participants.filter(
            (id: any) => String(id) !== targetId.toString(),
        );

        // also drop moderator role if present
        group.moderators = group.moderators.filter(
            (id: any) => String(id) !== targetId.toString(),
        );

        await group.save();

        res.json(group.toObject());
    },
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
        const groupId = new Types.ObjectId(req.params.id);
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ error: "Not found" });
        }

        if (!canUserManageGroup(req, group)) {
            return res.status(403).json({ error: "forbidden" });
        }

        const { userId } = req.body || {};
        if (!userId) {
            return res.status(400).json({ error: "userId is required" });
        }
        const uid = new Types.ObjectId(userId);

        if (!group.participants.some((id) => String(id) === uid.toString())) {
            group.participants.push(uid);
        }

        if (!group.moderators.some((id) => String(id) === uid.toString())) {
            group.moderators.push(uid);
        }

        await group.save();

        res.json(group.toObject());
    },
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
        const groupId = new Types.ObjectId(req.params.id);
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ error: "Not found" });
        }

        if (!canUserManageGroup(req, group)) {
            return res.status(403).json({ error: "forbidden" });
        }

        const targetId = new Types.ObjectId(req.params.userId);

        if (group.ownerId && String(group.ownerId) === targetId.toString()) {
            return res.status(400).json({ error: "cannot remove owner moderator role" });
        }

        group.moderators = group.moderators.filter(
            (id: any) => String(id) !== targetId.toString(),
        );

        await group.save();

        res.json(group.toObject());
    },
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
        const groupId = new Types.ObjectId(req.params.id);
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ error: "Not found" });
        }

        const { id: rawUserId } = getCurrentUser(req);
        if (!rawUserId) {
            return res.status(401).json({ error: "Unauthenticated" });
        }
        const uid = new Types.ObjectId(rawUserId);

        if (group.ownerId && String(group.ownerId) === uid.toString()) {
            return res.status(400).json({ error: "owner cannot leave group" });
        }

        group.participants = group.participants.filter(
            (id: any) => String(id) !== uid.toString(),
        );
        group.moderators = group.moderators.filter(
            (id: any) => String(id) !== uid.toString(),
        );

        await group.save();

        res.json(group.toObject());
    },
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
        const rawUserId = req.body?.userId as string | undefined;
        if (!rawUserId || !Types.ObjectId.isValid(rawUserId)) {
            return res.status(400).json({ error: "userId is required and must be valid ObjectId" });
        }

        const groupId = new Types.ObjectId(req.params.id);
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ error: "Group not found" });
        }

        // updated helper signature: (req, group)
        if (!canUserManageGroup(req, group)) {
            return res.status(403).json({
                error: "Only owner or admin/dispatcher can transfer ownership",
            });
        }

        const newOwnerId = new Types.ObjectId(rawUserId);
        group.ownerId = newOwnerId;

        const alreadyParticipant = group.participants.some(
            (p: any) => String(p) === newOwnerId.toString(),
        );
        if (!alreadyParticipant) {
            group.participants.push(newOwnerId);
        }

        await group.save();

        try {
            const newOwner = await User.findById(newOwnerId);
            if (newOwner) {
                await sendPushNotificationToUser(newOwner, {
                    title: "Group ownership transferred",
                    body: `You have been transferred the ownership of the group ${group.name}`,
                });
            }
        } catch (error) {
            console.error("[Groups] Failed to send push notification to new owner:", error);
        }

        res.json(group.toObject());
    },
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
        if (!group) {
            return res.status(404).json({ error: "Group not found" });
        }

        // updated helper signature: (req, group)
        if (!canUserModerateGroup(req, group)) {
            return res.status(403).json({ error: "Access denied" });
        }

        const code = crypto.randomUUID().replace(/-/g, "").slice(0, 12);

        const { id: rawUserId } = getCurrentUser(req);
        const createdBy = rawUserId ? new Types.ObjectId(rawUserId) : undefined;

        const invite = await GroupInvite.create({
            groupId,
            code,
            createdBy,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
        });

        res.status(201).json({
            code: invite.code,
            groupId: invite.groupId,
            expiresAt: invite.expiresAt,
        });
    },
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
    if (!code) {
        return res.status(400).json({ error: "Code is required" });
    }

    const invite = await GroupInvite.findOne({ code }).lean();
    if (!invite) {
        return res.status(400).json({ error: "Invalid invite" });
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
        return res.status(400).json({ error: "Invite expired" });
    }
    if ((invite as any).usedBy) {
        return res.status(400).json({ error: "Invite already used" });
    }

    const group = await Group.findById(invite.groupId);
    if (!group) {
        return res.status(400).json({ error: "Group not found" });
    }

    const { id: rawUserId } = getCurrentUser(req);
    if (!rawUserId) {
        return res.status(401).json({ error: "Unauthenticated" });
    }
    const userId = new Types.ObjectId(rawUserId);

    const alreadyParticipant = group.participants.some(
        (p: any) => String(p) === userId.toString(),
    );
    if (!alreadyParticipant) {
        group.participants.push(userId);
        await group.save();
    }

    await GroupInvite.updateOne(
        { _id: (invite as any)._id },
        { $set: { usedBy: userId, usedAt: new Date() } },
    );

    try {
        const owner = await User.findById(group.ownerId);
        if (owner) {
            await sendPushNotificationToUser(owner, {
                title: "New member joined",
                body: `User ${userId.toString()} has joined the group ${group.name}`,
            });
        }
    } catch (error) {
        console.error("[Groups] Failed to send push notification to owner:", error);
    }

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
 *     summary: Group dashboard - rides, ride shares, requests, drivers
 *     tags: [Groups]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: "^[0-9a-fA-F]{24}$"
 *     responses:
 *       200:
 *         description: Dashboard snapshot for a group
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 group:
 *                   type: object
 *                 drivers:
 *                   type: array
 *                   items:
 *                     type: object
 *                 rides:
 *                   type: object
 *                   properties:
 *                     activeAssigned: { type: array }
 *                     activeUnassigned: { type: array }
 *                     history: { type: array }
 *                 rideRequests:
 *                   type: array
 *                 shares:
 *                   type: array
 */
router.get(
    "/:id([0-9a-fA-F]{24})/dashboard",
    requireAuth,
    async (req: Request, res: Response) => {
        const { id: rawUserId } = getCurrentUser(req);
        if (!rawUserId) {
            return res.status(401).json({ error: "Unauthenticated" });
        }

        const userId = new Types.ObjectId(rawUserId);
        const isAdmin = userHasAdminRole(req);
        const groupId = new Types.ObjectId(req.params.id);

        const group = await Group.findById(groupId).lean();
        if (!group) {
            return res.status(404).json({ error: "Not found" });
        }

        if (!isAdmin && !userInGroupDoc(group, userId)) {
            return res.status(403).json({ error: "forbidden" });
        }

        // 1) All group-targeted ride shares (newest first)
        const shares = await RideShare.find({
            visibility: "groups",
            groupIds: groupId,
            status: { $in: ["active", "revoked", "expired", "closed"] },
        })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        const rideIds = Array.from(
            new Set(shares.map((s: any) => String(s.rideId))),
        ).map((id) => new Types.ObjectId(id));

        const shareCreatorIds = Array.from(
            new Set(
                shares
                    .map((s: any) => s.createdBy && String(s.createdBy))
                    .filter(Boolean),
            ),
        ).map((id) => new Types.ObjectId(id));

        // 2) Load rides, share creators, and claims
        const [rides, shareCreators, rideClaims] = await Promise.all([
            rideIds.length
                ? Ride.find(
                    { _id: { $in: rideIds } },
                    {
                        from: 1,
                        to: 1,
                        status: 1,
                        datetime: 1,
                        assignedDriverId: 1,
                    },
                ).lean()
                : [],
            shareCreatorIds.length
                ? User.find(
                    { _id: { $in: shareCreatorIds } },
                    { name: 1, email: 1 },
                ).lean()
                : [],
            rideIds.length
                ? RideClaim.find({ rideId: { $in: rideIds } }).lean()
                : [],
        ]);

        // plain object maps
        const rideMap: Record<string, any> = {};
        for (const r of rides) {
            rideMap[String(r._id)] = r;
        }

        const shareCreatorMap: Record<string, any> = {};
        for (const u of shareCreators) {
            shareCreatorMap[String(u._id)] = u;
        }

        // 3) Bucket rides: activeAssigned / activeUnassigned / history
        const activeAssigned: any[] = [];
        const activeUnassigned: any[] = [];
        const history: any[] = [];

        const doneStatuses = ["clear", "completed", "cancelled"];

        for (const ride of rides) {
            const status = ride.status;
            if (doneStatuses.includes(status)) {
                history.push(ride);
            } else if (ride.assignedDriverId) {
                activeAssigned.push(ride);
            } else {
                activeUnassigned.push(ride);
            }
        }

        // 4) Decorate shares with ride + user
        const sharesWithDetails = shares.map((s: any) => ({
            _id: s._id,
            rideId: s.rideId,
            visibility: s.visibility,
            status: s.status,
            groupIds: s.groupIds,
            driverIds: s.driverIds,
            expiresAt: s.expiresAt,
            maxClaims: s.maxClaims,
            claimsCount: s.claimsCount,
            createdAt: s.createdAt,
            ride: rideMap[String(s.rideId)] || null,
            sharedBy: s.createdBy ? shareCreatorMap[String(s.createdBy)] || null : null,
        }));

        // 5) Driver profiles (assigned drivers in these rides)
        const driverIds = Array.from(
            new Set(
                rides
                    .map((r: any) => r.assignedDriverId && String(r.assignedDriverId))
                    .filter(Boolean),
            ),
        ).map((id) => new Types.ObjectId(id));

        const drivers = driverIds.length
            ? await User.find(
                { _id: { $in: driverIds } },
                { name: 1, email: 1 },
            ).lean()
            : [];

        res.json({
            group: pick(group as any, [
                "_id",
                "name",
                "type",
                "city",
                "visibility",
                "isInviteOnly",
                "tags",
                "rules",
                "ownerId",
            ]),
            drivers,
            rides: {
                activeAssigned,
                activeUnassigned,
                history,
            },
            rideRequests: rideClaims,
            shares: sharesWithDetails,
        });
    },
);

export default router;
