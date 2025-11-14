import { Router, Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import Ride from "../models/ride.model";
import {requireAuth, requireRole} from "../lib/auth";
import {hasRideExpired, IRideShare, RideShare} from "../models/rideShare.model";
import Group from "../models/group.model";
import {RideClaim} from "../models/rideClaim.model";

const router = Router();
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";
const isObjectId = (v: any) => Types.ObjectId.isValid(String(v));

const serializeShare = (s: any) => ({
    shareId: String(s._id),       // alias for UI compatibility
    rideId: String(s.rideId),
    visibility: s.visibility,
    groupIds: (s.groupIds || []).map(String),
    driverIds: (s.driverIds || []).map(String),
    expiresAt: s.expiresAt ?? null,
    maxClaims: s.maxClaims ?? null,
    claimsCount: s.claimsCount ?? 0,
    status: s.status,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
});

function sanitizeRideForDriver(ride: any) {
    // Hide sensitive fields if needed; keep essentials
    const {
        _id, from, to, datetime, type, status, notes,
        fromLocation, toLocation, customer, payment, assignedDriverId
    } = ride;
    return {
        _id, from, to, datetime, type, status,
        fromLocation, toLocation,
        customer: customer ? { name: customer.name || "", phone: customer.phone || "" } : undefined,
        assignedDriverId,
        // omit: internal queue, internal notes (optionally)
    };
}

async function ensureAcl(share: IRideShare, driverId: string) {
    if (share.visibility === "public") return true;
    if (share.visibility === "drivers") {
        return (share.driverIds || []).some((id) => String(id) === String(driverId));
    }
    const count = await Group.countDocuments({
        _id: { $in: share.groupIds || [] },
        members: { $in: [driverId] },
    });
    return count > 0;
}

/**
 * @openapi
 * /ride-shares/{shareId}:
 *   get:
 *     summary: Resolve a public/group/driver share (driver auth)
 *     tags: [RideShares]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: shareId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Share & ride
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ride: { type: object }
 *                 share:
 *                   type: object
 *                   properties:
 *                     visibility: { type: string }
 *                     expiresAt: { type: string, format: date-time, nullable: true }
 *                     maxClaims: { type: integer, nullable: true }
 *                     status: { type: string }
 *       403: { description: Forbidden (ACL) }
 *       404: { description: Not found / expired / revoked }
 */
router.get("/:shareId([0-9a-fA-F]{24})", requireAuth, requireRole(["driver"]), async (req, res) => {
    const { shareId } = req.params;
    const driverId = (req as any).user.id;

    const share = await RideShare.findById(shareId);
    if (!share) return res.status(404).json({ error: "Share not found" });

    if (share.status === "active" && hasRideExpired(share)) {
        await RideShare.findByIdAndUpdate(share._id, { $set: { status: "expired" } });
        return res.status(404).json({ error: "Share expired" });
    }
    if (share.status !== "active") return res.status(404).json({ error: "Share inactive" });

    if (!(await ensureAcl(share as any, driverId))) return res.status(403).json({ error: "Forbidden" });

    const ride = await Ride.findById(share.rideId).lean();
    if (!ride) return res.status(404).json({ error: "Ride not found" });

    res.json({ ride: sanitizeRideForDriver(ride), share: serializeShare(share) });
});

/* ==================================================================== */
/* =============== DRIVER: queue a claim from a share ================== */
/* ==================================================================== */

/**
 * @openapi
 * /ride-shares/{shareId}/claim:
 *   post:
 *     summary: Queue a claim for a shared ride (driver request)
 *     description: Creates (or idempotently returns) a queued claim for the given share. This **does not** assign the ride; a dispatcher/admin must approve one claim.
 *     tags: [RideShares]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: shareId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: "^[0-9a-fA-F]{24}$"
 *         description: Mongo ObjectId of the RideShare document.
 *     responses:
 *       200:
 *         description: Claim queued (or already queued)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:  { type: string, enum: [queued] }
 *                 claimId: { type: string }
 *                 rideId:  { type: string }
 *                 shareId: { type: string }
 *       403: { description: Forbidden (ACL) }
 *       404: { description: Share not found / expired / inactive / ride closed }
 *       409: { description: Ride already assigned }
 */
router.post(
    "/:shareId([0-9a-fA-F]{24})/claim",
    requireAuth,
    requireRole(["driver"]),
    async (req: Request, res: Response) => {
        const { shareId } = req.params;
        const driverId = (req as any).user.id;

        const share = await RideShare.findById(shareId);
        if (!share) return res.status(404).json({ error: "Share not found" });

        // expiry/inactive checks
        if (share.status === "active" && hasRideExpired(share)) {
            share.status = "expired";
            await share.save();
            return res.status(404).json({ error: "Share expired" });
        }
        if (share.status !== "active") return res.status(404).json({ error: "Share inactive" });

        if (!(await ensureAcl(share as any, driverId))) return res.status(403).json({ error: "Forbidden" });

        const ride = await Ride.findById(share.rideId).lean();
        if (!ride) return res.status(404).json({ error: "Ride not found" });
        if ((ride.status as string) === "completed") return res.status(404).json({ error: "Ride closed" });
        if (ride.assignedDriverId) return res.status(409).json({ error: "Ride already assigned" });

        // Create or keep existing queued claim for (ride, driver)
        const claim = await RideClaim.findOneAndUpdate(
            { rideId: share.rideId, driverId, status: "queued" },
            { $setOnInsert: { shareId: share._id } },
            { new: true, upsert: true }
        );

        // optional: telemetry (naive)
        share.claimsCount = (share.claimsCount ?? 0) + 1;
        await share.save();

        return res.json({
            status: "queued",
            claimId: String(claim._id),
            rideId: String(share.rideId),
            shareId: String(share._id),
        });
    }
);

/**
 * @openapi
 * /ride-shares/{shareId}:
 *   patch:
 *     summary: Update a ride share
 *     description: Update visibility, ACL lists, expiry/maxClaims, and syncQueue for a share.
 *     tags: [RideShares]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: shareId
 *         required: true
 *         schema: { type: string }
 *         description: Mongo ObjectId of the ride-share document (24-hex).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               visibility: { type: string, enum: [public, groups, drivers] }
 *               groupIds:   { type: array, items: { type: string } }
 *               driverIds:  { type: array, items: { type: string } }
 *               expiresAt:  { type: string, format: date-time, nullable: true }
 *               maxClaims:  { type: integer, minimum: 1, nullable: true }
 *               syncQueue:  { type: boolean }
 *     responses:
 *       200:
 *         description: Updated share
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 shareId:     { type: string }
 *                 rideId:      { type: string }
 *                 visibility:  { type: string, enum: [public, groups, drivers] }
 *                 groupIds:    { type: array, items: { type: string } }
 *                 driverIds:   { type: array, items: { type: string } }
 *                 expiresAt:   { type: string, format: date-time, nullable: true }
 *                 maxClaims:   { type: integer, nullable: true }
 *                 claimsCount: { type: integer }
 *                 status:      { type: string, enum: [active, revoked, expired, closed] }
 *                 createdAt:   { type: string, format: date-time }
 *                 updatedAt:   { type: string, format: date-time }
 *       404: { description: Share not found }
 *       400: { description: Validation error }
 */
router.patch("/:shareId([0-9a-fA-F]{24})", requireAuth, requireRole(["dispatcher", "admin"]), async (req, res) => {
    const { shareId } = req.params;
    const share = await RideShare.findById(shareId);
    if (!share) return res.status(404).json({ error: "Share not found" });

    const { visibility, groupIds, driverIds, expiresAt, maxClaims, syncQueue } = req.body ?? {};
    const $set: Record<string, any> = {};

    if (visibility) {
        if (!["public", "groups", "drivers"].includes(visibility))
            return res.status(400).json({ error: "Invalid visibility" });
        $set.visibility = visibility;
        if (visibility !== "groups")  $set.groupIds  = [];
        if (visibility !== "drivers") $set.driverIds = [];
    }
    if (Array.isArray(groupIds))  $set.groupIds  = groupIds.filter(Boolean).map((id: string) => new Types.ObjectId(id));
    if (Array.isArray(driverIds)) $set.driverIds = driverIds.filter(Boolean).map((id: string) => new Types.ObjectId(id));

    if (expiresAt === null) $set.expiresAt = null;
    else if (typeof expiresAt === "string" && expiresAt.trim()) {
        const d = new Date(expiresAt);
        if (isNaN(d.getTime())) return res.status(400).json({ error: "Invalid expiresAt" });
        $set.expiresAt = d;
    }

    if (maxClaims === null) $set.maxClaims = null;
    else if (typeof maxClaims !== "undefined") {
        const n = Number(maxClaims);
        if (!Number.isInteger(n) || n < 1) return res.status(400).json({ error: "Invalid maxClaims" });
        $set.maxClaims = n;
    }

    if (typeof syncQueue === "boolean") $set.syncQueue = syncQueue;

    if (Object.keys($set).length === 0) return res.status(400).json({ error: "No updatable fields provided" });

    if (($set.expiresAt || share.expiresAt) && share.status === "active") {
        const nextExpiry = $set.expiresAt ?? share.expiresAt;
        if (nextExpiry && nextExpiry.getTime() <= Date.now()) $set.status = "expired";
    }

    const updated = await RideShare.findByIdAndUpdate(share._id, { $set }, { new: true, runValidators: true }).lean();
    res.json(serializeShare(updated));
});


/**
 * @openapi
 * /ride-shares/{shareId}:
 *   delete:
 *     summary: Revoke a specific ride share
 *     description: Revokes a single active ride share identified by its shareId. Idempotent — if already revoked, returns 200.
 *     tags: [RideShares]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shareId
 *         required: true
 *         schema:
 *           type: string
 *         description: The public identifier of the ride share (not the Mongo _id).
 *     responses:
 *       200:
 *         description: Share revoked (or already revoked)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 shareId:   { type: string }
 *                 rideId:    { type: string }
 *                 status:    { type: string, enum: ["revoked"] }
 *                 revokedAt: { type: string, format: date-time }
 *       404:
 *         description: Share not found
 */
router.delete("/:shareId([0-9a-fA-F]{24})",
    requireAuth,
    requireRole(["driver", "dispatcher", "admin"]),
    async (req, res) => {
    const { shareId } = req.params;
    const share = await RideShare.findById(shareId).lean();
    if (!share) return res.status(404).json({ error: "Share not found" });

    if (share.status === "revoked") {
        return res.json({
            shareId: String(share._id),
            rideId: String(share.rideId),
            status: "revoked",
            revokedAt: share.revokedAt ?? new Date(0).toISOString(),
        });
    }

    const updated = await RideShare.findByIdAndUpdate(
        shareId,
        { $set: { status: "revoked", revokedAt: new Date() } },
        { new: true }
    ).lean();

    res.json({
        shareId: String(updated!._id),
        rideId: String(updated!.rideId),
        status: "revoked",
        revokedAt: updated!.revokedAt,
    });
});

/**
 * @openapi
 * /ride-shares/inbox:
 *   get:
 *     summary: Driver inbox of shared rides (available or claimed)
 *     tags: [RideShares]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: tab
 *         required: false
 *         schema: { type: string, enum: [available, claimed], default: available }
 *     responses:
 *       200:
 *         description: List of shared rides for the driver
 */
router.get(
    "/inbox",
    requireAuth,
    requireRole(["driver"]),
    async (req: Request, res: Response) => {
        const driverId = (req as any).user.id;
        const tab = (req.query.tab as "available" | "claimed") ?? "available";
        const now = new Date();

        // groups the driver belongs to
        const groupIds = await Group.find({ members: driverId }).select("_id").lean();
        const groupIdList = groupIds.map((g) => g._id);

        if (tab === "available") {
            const shares = await RideShare.find({
                status: "active",
                $or: [
                    { visibility: "public" },
                    { visibility: "drivers", driverIds: driverId },
                    { visibility: "groups", groupIds: { $in: groupIdList } },
                    { expiresAt: null }, { expiresAt: { $gt: now } }
                ],
            })
                .sort({ createdAt: -1 })
                .lean();

            // expire on the fly (lightweight)
            const expiredIds = shares
                .filter((s) => hasRideExpired(s as any))
                .map((s) => s._id);
            if (expiredIds.length) {
                await RideShare.updateMany({ _id: { $in: expiredIds } }, { $set: { status: "expired" } });
            }

            // fetch rides for those shares that are still active & unassigned
            const activeShares = shares.filter((s) => !expiredIds.includes(s._id));
            const rideIds = activeShares.map((s) => s.rideId);
            const rides = await Ride.find({
                _id: { $in: rideIds },
                assignedDriverId: { $in: [null, undefined] },
                status: { $ne: "completed" },
            })
                .select("_id from to datetime status fromLocation toLocation customer")
                .lean();
            const rideMap = new Map(rides.map((r) => [String(r._id), r]));

            const myClaims = await RideClaim.find({
                rideId: { $in: rideIds },
                driverId,
                status: { $in: ["queued", "approved"] }, // show queued; approved means already assigned
            }).select("_id rideId status createdAt").lean();

            const myClaimByRide = new Map(
                myClaims.map((c: any) => [String(c.rideId), c])
            );

            const items = activeShares
                .map((s) => {
                    const ride = rideMap.get(String(s.rideId));
                    if (!ride) return null;

                    const my = myClaimByRide.get(String(ride._id));

                    return {
                        shareId: String(s._id),
                        visibility: s.visibility,
                        expiresAt: s.expiresAt,
                        maxClaims: s.maxClaims ?? null,
                        claimsCount: s.claimsCount ?? 0,
                        myClaim: my
                            ? { claimId: String(my._id), status: my.status, createdAt: my.createdAt }
                            : null,
                        ride: {
                            _id: String(ride._id),
                            from: ride.from,
                            to: ride.to,
                            datetime: ride.datetime,
                            status: ride.status,
                            fromLocation: ride.fromLocation,
                            toLocation: ride.toLocation,
                            customer: ride.customer
                                ? { name: ride.customer.name ?? "", phone: ride.customer.phone ?? "" }
                                : undefined,
                        },
                    };
                })
                .filter(Boolean);

            return res.json(items);
        }

        // CLAIMED tab: rides assigned to this driver that originated from a share the driver had access to
        const claimedRides = await Ride.find({
            assignedDriverId: driverId,
        })
            .select("_id from to datetime status fromLocation toLocation customer")
            .lean();

        if (!claimedRides.length) return res.json([]);

        const rideIds = claimedRides.map((r) => r._id);
        const shares = await RideShare.find({
            rideId: { $in: rideIds },
            $or: [
                { visibility: "public" },
                { visibility: "drivers", driverIds: driverId },
                { visibility: "groups", groupIds: { $in: groupIdList } },
            ],
        })
            .sort({ createdAt: -1 })
            .lean();

        const lastShareByRide = new Map<string, any>();
        for (const s of shares) {
            const key = String(s.rideId);
            // keep the most recent share per ride
            if (!lastShareByRide.has(key) || lastShareByRide.get(key).createdAt < s.createdAt) {
                lastShareByRide.set(key, s);
            }
        }

        const items = claimedRides.map((r) => {
            const s = lastShareByRide.get(String(r._id));
            return {
                shareId: s ? s.shareId ?? String(s._id) : null,
                visibility: s?.visibility ?? null,
                expiresAt: s?.expiresAt ?? null,
                maxClaims: s?.maxClaims ?? null,
                claimsCount: s?.claimsCount ?? 0,
                status: s?.status ?? null,
                ride: {
                    _id: String(r._id),
                    from: r.from,
                    to: r.to,
                    datetime: r.datetime,
                    status: r.status,
                    fromLocation: r.fromLocation,
                    toLocation: r.toLocation,
                    customer: r.customer ? { name: r.customer.name ?? "", phone: r.customer.phone ?? "" } : undefined,
                },
            };
        });

        return res.json(items);
    }
);

/**
 * @openapi
 * /ride-shares/inbox/count:
 *   get:
 *     summary: Count of shared rides visible to the driver (available or claimed)
 *     tags: [RideShares]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: tab
 *         required: false
 *         schema: { type: string, enum: [available, claimed], default: available }
 *     responses:
 *       200:
 *         description: Count payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count: { type: integer, example: 3 }
 */
router.get(
    "/inbox/count",
    requireAuth,
    requireRole(["driver"]),
    async (req: Request, res: Response) => {
        const driverId = (req as any).user.id;
        const tab = (req.query.tab as "available" | "claimed") ?? "available";
        const now = new Date();

        const groups = await Group.find({ members: driverId }).select("_id").lean();
        const groupIds = groups.map((g) => g._id);

        if (tab === "claimed") {
            const count = await Ride.countDocuments({ assignedDriverId: driverId });
            return res.json({ count });
        }

        const result = await RideShare.aggregate([
            {
                $match: {
                    status: "active",
                    $and: [
                        {
                            $or: [
                                { visibility: "public" },
                                { visibility: "drivers", driverIds: new Types.ObjectId(driverId) },
                                { visibility: "groups", groupIds: { $in: groupIds } },
                            ],
                        },
                        {
                            $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: "rides",
                    localField: "rideId",
                    foreignField: "_id",
                    as: "ride",
                    pipeline: [
                        // claimable = not assigned & not completed
                        { $match: { assignedDriverId: { $in: [null, undefined] }, status: { $ne: "completed" } } },
                        { $project: { _id: 1 } },
                    ],
                },
            },
            { $match: { "ride.0": { $exists: true } } },
            { $count: "count" },
        ]);

        const count = result[0]?.count ?? 0;
        return res.json({ count });
    }
);

export default router;
