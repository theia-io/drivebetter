// src/routes/customers.ts
import { Router, Request, Response } from "express";
import { Types } from "mongoose";
import { customAlphabet } from "nanoid";

import {requireAuth, requireRole} from "../lib/auth";
import { hashPassword } from "../lib/crypto";
import User from "../models/user.model";
import CustomerProfile from "../models/customerProfile.model";
import { CustomerInvite } from "../models/customerInvite.model";

const router = Router();
const generateInviteCode = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 10);

function hasInviteExpired(invite: { expiresAt?: Date | null }) {
    if (!invite.expiresAt) return false;
    return invite.expiresAt.getTime() <= Date.now();
}

/**
 * @openapi
 * /customers:
 *   get:
 *     summary: List customers invited by current user
 *     description: |
 *       Returns customers whose `CustomerProfile.invitedBy` matches the authenticated user.
 *       Only users with roles `admin`, `dispatcher`, or `driver` can access this endpoint.
 *
 *       Each item contains:
 *       - `user`: the underlying User document (client)
 *       - `profile`: the CustomerProfile document
 *       - `stats`: optional aggregate stats (placeholder for now)
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of customers invited by current user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   user:
 *                     $ref: '#/components/schemas/User'
 *                   profile:
 *                     $ref: '#/components/schemas/CustomerProfile'
 *                   stats:
 *                     type: object
 *                     nullable: true
 *                     properties:
 *                       ridesTotal:
 *                         type: integer
 *                         description: Total rides for this customer (to be implemented once rides are linked to customers)
 *                       lastRideAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                         description: Datetime of most recent ride (to be implemented once rides are linked to customers)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (caller not allowed)
 */
router.get("/", requireAuth, async (req: Request, res: Response) => {
    const me = (req as any).user as { id: string; roles: string[] };

    const allowed = me?.roles?.some((r) => r === "admin" || r === "dispatcher" || r === "driver");
    if (!allowed) {
        return res.status(403).json({ error: "Forbidden" });
    }

    // Find profiles where this user is the inviter
    const profiles = await CustomerProfile.find({ invitedBy: me.id }).lean();
    if (!profiles.length) {
        return res.json([]);
    }

    const userIds = profiles.map((p) => p.userId).filter(Boolean) as Types.ObjectId[];
    const users = await User.find({ _id: { $in: userIds } })
        .select(
            "-passwordHash -refreshTokens -otpCode -otpExpires -resetToken -resetExpires -emailVerifyToken -emailVerifyExpires"
        )
        .lean();

    const userMap = new Map<string, any>();
    for (const u of users) {
        userMap.set(String(u._id), u);
    }

    // Stats are left as null placeholders for now.
    // To implement real stats you'll need to:
    // - link rides to customers (e.g. Ride.customerUserId)
    // - aggregate rides per customer.
    const result = profiles
        .map((p) => {
            const u = userMap.get(String(p.userId));
            if (!u) return null;
            return {
                user: u,
                profile: p,
                stats: null as {
                    ridesTotal?: number;
                    lastRideAt?: string | null;
                } | null,
            };
        })
        .filter(Boolean);

    return res.json(result);
});

/**
 * @openapi
 * /customers/invites:
 *   post:
 *     summary: Create customer invite
 *     description: |
 *       Creates a personal invite for a future customer by email.
 *       Only users with `admin` or `dispatcher` role may create invites.
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               message:
 *                 type: string
 *                 description: Optional message or note for the invitation
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 description: Optional explicit expiration date-time for this invite
 *     responses:
 *       201:
 *         description: Created invite
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:        { type: string }
 *                 email:      { type: string, format: email }
 *                 invitedBy:  { type: string }
 *                 code:       { type: string }
 *                 message:    { type: string }
 *                 expiresAt:  { type: string, format: date-time, nullable: true }
 *                 createdAt:  { type: string, format: date-time }
 *                 updatedAt:  { type: string, format: date-time }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (caller is not admin/dispatcher)
 */
router.post("/invites",
    requireAuth,
    requireRole(["driver", "dispatcher", "admin"]),
    async (req: Request, res: Response) => {
    try {
        const me = (req as any).user as { id: string; roles: string[] };

        const { email, message, expiresAt } = req.body || {};

        if (!email || typeof email !== "string") {
            return res.status(400).json({ error: "email is required" });
        }

        const normalizedEmail = email.trim().toLowerCase();

        let expiresAtDate: Date | null = null;
        if (expiresAt != null) {
            const d = new Date(expiresAt);
            if (isNaN(d.getTime())) {
                return res.status(400).json({ error: "expiresAt must be a valid date-time" });
            }
            expiresAtDate = d;
        }

        const code = generateInviteCode();

        const invite = await CustomerInvite.create({
            email: normalizedEmail,
            invitedBy: new Types.ObjectId(me.id),
            code,
            message: typeof message === "string" ? message.trim() : undefined,
            expiresAt: expiresAtDate,
        });

        const plain = invite.toObject();
        return res.status(201).json(plain);
    } catch (err: any) {
        console.error("[customers/invites POST] error:", err);
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /customers/invites:
 *   get:
 *     summary: List customer invites created by current user
 *     description: |
 *       Returns invitations where `invitedBy` is the authenticated user.
 *       Only admin/dispatcher/driver are allowed.
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of invites created by current user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:        { type: string }
 *                   email:      { type: string, format: email }
 *                   code:       { type: string }
 *                   status:
 *                     type: string
 *                     enum: [pending, used, expired]
 *                   expiresAt:  { type: string, format: date-time, nullable: true }
 *                   usedAt:     { type: string, format: date-time, nullable: true }
 *                   createdAt:  { type: string, format: date-time }
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get("/invites", requireAuth, async (req: Request, res: Response) => {
    const me = (req as any).user as { id: string; roles: string[] };

    const allowed = me?.roles?.some((r) => r === "admin" || r === "dispatcher" || r === "driver");
    if (!allowed) {
        return res.status(403).json({ error: "Forbidden" });
    }

    const invites = await CustomerInvite.find({ invitedBy: me.id })
        .sort({ createdAt: -1 })
        .lean();

    const now = Date.now();

    const result = invites.map((inv) => {
        const expired =
            inv.expiresAt instanceof Date
                ? inv.expiresAt.getTime() <= now
                : false;

        const status: "pending" | "used" | "expired" =
            inv.usedBy != null ? "used" : expired ? "expired" : "pending";

        return {
            _id: String(inv._id),
            email: inv.email,
            code: inv.code,
            status,
            expiresAt: inv.expiresAt || null,
            usedAt: inv.usedAt || null,
            createdAt: inv.createdAt,
        };
    });

    return res.json(result);
});

/**
 * @openapi
 * /customers/invites/{code}:
 *   get:
 *     summary: Get customer invite metadata by code
 *     description: |
 *       Resolve a customer invite using its code (from email link).
 *       This endpoint is public and does not require authentication.
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invite metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 email: { type: string, format: email }
 *                 invitedBy:
 *                   type: object
 *                   properties:
 *                     _id:   { type: string }
 *                     name:  { type: string }
 *                     email: { type: string }
 *                 status:
 *                   type: string
 *                   enum: [pending, used, expired]
 *                 expiresAt: { type: string, format: date-time, nullable: true }
 *                 usedAt:    { type: string, format: date-time, nullable: true }
 *       404:
 *         description: Invite not found
 */
router.get("/invites/:code", async (req: Request, res: Response) => {
    const code = String(req.params.code || "").trim();
    if (!code) return res.status(404).json({ error: "Invite not found" });

    const invite = await CustomerInvite.findOne({ code }).lean();
    if (!invite) return res.status(404).json({ error: "Invite not found" });

    const expired = hasInviteExpired(invite);
    const status: "pending" | "used" | "expired" =
        invite.usedBy != null ? "used" : expired ? "expired" : "pending";

    const inviter = await User.findById(invite.invitedBy)
        .select({ _id: 1, name: 1, email: 1 })
        .lean();

    return res.json({
        email: invite.email,
        invitedBy: inviter || null,
        status,
        expiresAt: invite.expiresAt || null,
        usedAt: invite.usedAt || null,
    });
});

/**
 * @openapi
 * /customers/register:
 *   post:
 *     summary: Register invited customer
 *     description: |
 *       Completes registration for a customer created by a personal invite.
 *       The invite code is required and must be valid, unused, and not expired.
 *     tags: [Customers]
 *     security: []   # public endpoint
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, name, password]
 *             properties:
 *               code:
 *                 type: string
 *                 description: Invitation code from the email link
 *               name:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 6
 *               phone:
 *                 type: string
 *                 description: Optional phone number
 *               age:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 120
 *                 description: Optional age
 *     responses:
 *       201:
 *         description: Customer registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 customerProfile:
 *                   $ref: '#/components/schemas/CustomerProfile'
 *       400:
 *         description: Invalid invite or validation error
 *       409:
 *         description: Email already in use
 */
router.post("/register", async (req: Request, res: Response) => {
    try {
        const { code, name, password, phone, age } = req.body || {};

        if (!code || typeof code !== "string") {
            return res.status(400).json({ error: "code is required" });
        }
        if (!name || typeof name !== "string") {
            return res.status(400).json({ error: "name is required" });
        }
        if (!password || typeof password !== "string" || password.length < 6) {
            return res
                .status(400)
                .json({ error: "password must be a string with at least 6 characters" });
        }

        const invite = await CustomerInvite.findOne({ code }).lean();
        if (!invite) {
            return res.status(400).json({ error: "Invalid invite code" });
        }
        if (invite.usedBy) {
            return res.status(400).json({ error: "Invite already used" });
        }
        if (hasInviteExpired(invite)) {
            return res.status(400).json({ error: "Invite has expired" });
        }

        const existingUser = await User.findOne({ email: invite.email }).lean();
        if (existingUser) {
            return res.status(409).json({ error: "Email already in use" });
        }

        const passwordHash = await hashPassword(password);

        const userDoc = await User.create({
            name: name.trim(),
            email: invite.email,
            phone: typeof phone === "string" ? phone.trim() : undefined,
            roles: ["customer"],
            passwordHash,
            emailVerified: true,
        });

        const customerProfile = await CustomerProfile.create({
            userId: userDoc._id,
            invitedBy: invite.invitedBy,
            age: typeof age === "number" ? age : undefined,
        });

        await CustomerInvite.updateOne(
            { _id: invite._id },
            {
                $set: {
                    usedBy: userDoc._id,
                    usedAt: new Date(),
                },
            }
        );

        const user = userDoc.toObject();
        delete (user as any).passwordHash;
        delete (user as any).refreshTokens;
        delete (user as any).otpCode;
        delete (user as any).otpExpires;
        delete (user as any).resetToken;
        delete (user as any).resetExpires;
        delete (user as any).emailVerifyToken;
        delete (user as any).emailVerifyExpires;

        return res.status(201).json({
            user,
            customerProfile: customerProfile.toObject(),
        });
    } catch (err: any) {
        console.error("[customers/register POST] error:", err);
        return res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /customers/me:
 *   get:
 *     summary: Get current customer profile
 *     description: |
 *       Returns the authenticated customer's user data, customer profile,
 *       and basic info about the inviter.
 *       Requires role `client`.
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customer profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 profile:
 *                   $ref: '#/components/schemas/CustomerProfile'
 *                 invitedBy:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     _id:   { type: string }
 *                     name:  { type: string }
 *                     email: { type: string }
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not a customer)
 */
router.get("/me", requireAuth, async (req: Request, res: Response) => {
    const me = (req as any).user as { id: string; roles: string[] };

    const isCustomer = me?.roles?.includes("customer");
    if (!isCustomer) {
        return res.status(403).json({ error: "Forbidden" });
    }

    const user = await User.findById(me.id)
        .select(
            "-passwordHash -refreshTokens -otpCode -otpExpires -resetToken -resetExpires -emailVerifyToken -emailVerifyExpires"
        )
        .lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    const profile = await CustomerProfile.findOne({ userId: me.id }).lean();
    if (!profile) {
        return res.json({ user, profile: null, invitedBy: null });
    }

    const inviter = await User.findById(profile.invitedBy)
        .select({ _id: 1, name: 1, email: 1 })
        .lean();

    return res.json({
        user,
        profile,
        invitedBy: inviter || null,
    });
});

/**
 * @openapi
 * /customers/me:
 *   patch:
 *     summary: Update current customer basic info
 *     description: |
 *       Allows the authenticated customer to update their basic information
 *       such as name, phone, and age. Requires role `client`.
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               age:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 120
 *     responses:
 *       200:
 *         description: Updated customer profile
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not a customer)
 */
router.patch("/me", requireAuth, async (req: Request, res: Response) => {
    try {
        const me = (req as any).user as { id: string; roles: string[] };

        const isCustomer = me?.roles?.includes("customer");
        if (!isCustomer) {
            return res.status(403).json({ error: "Forbidden" });
        }

        const { name, phone, age } = req.body || {};

        const userUpdate: any = {};
        if (typeof name === "string") userUpdate.name = name.trim();
        if (typeof phone === "string") userUpdate.phone = phone.trim();

        let updatedUser = null;
        if (Object.keys(userUpdate).length) {
            updatedUser = await User.findByIdAndUpdate(
                me.id,
                { $set: userUpdate },
                { new: true, runValidators: true }
            )
                .select(
                    "-passwordHash -refreshTokens -otpCode -otpExpires -resetToken -resetExpires -emailVerifyToken -emailVerifyExpires"
                )
                .lean();
        } else {
            updatedUser = await User.findById(me.id)
                .select(
                    "-passwordHash -refreshTokens -otpCode -otpExpires -resetToken -resetExpires -emailVerifyToken -emailVerifyExpires"
                )
                .lean();
        }

        if (!updatedUser) return res.status(404).json({ error: "User not found" });

        const profileUpdate: any = {};
        if (typeof age === "number") profileUpdate.age = age;

        let profile = await CustomerProfile.findOne({ userId: me.id });
        if (!profile) {
            profile = await CustomerProfile.create({
                userId: new Types.ObjectId(me.id),
                invitedBy: new Types.ObjectId(me.id), // fallback; proper invitedBy is set at registration
                ...(Object.keys(profileUpdate).length ? profileUpdate : {}),
            });
        } else if (Object.keys(profileUpdate).length) {
            Object.assign(profile, profileUpdate);
            await profile.save();
        }

        const inviter = await User.findById(profile.invitedBy)
            .select({ _id: 1, name: 1, email: 1 })
            .lean();

        return res.json({
            user: updatedUser,
            profile: profile.toObject(),
            invitedBy: inviter || null,
        });
    } catch (err: any) {
        console.error("[customers/me PATCH] error:", err);
        return res.status(400).json({ error: err.message });
    }
});

export default router;

/**
 * @openapi
 * components:
 *   schemas:
 *     CustomerProfile:
 *       type: object
 *       properties:
 *         _id:       { type: string }
 *         userId:    { type: string }
 *         invitedBy: { type: string }
 *         age:       { type: integer, minimum: 0, maximum: 120 }
 *         notes:     { type: string }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *     CustomerInvite:
 *       type: object
 *       properties:
 *         _id:       { type: string }
 *         email:     { type: string, format: email }
 *         invitedBy: { type: string }
 *         code:      { type: string }
 *         message:   { type: string }
 *         expiresAt: { type: string, format: date-time, nullable: true }
 *         usedBy:    { type: string, nullable: true }
 *         usedAt:    { type: string, format: date-time, nullable: true }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 */
