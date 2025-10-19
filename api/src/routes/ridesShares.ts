import { Router, Request, Response } from "express";
import { Types } from "mongoose";
import Ride from "../models/ride.model";
import User from "../models/user.model";
import {requireAuth, requireRole} from "../lib/auth";
import {hasRideExpired, IRideShare, RideShare} from "../models/rideShare.model";
import Group from "../models/group.model";

const router = Router();
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";
const isObjectId = (v: any) => Types.ObjectId.isValid(String(v));

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
router.get(
    "/ride-shares/:shareId([0-9a-fA-F]{24})",
    requireAuth,
    requireRole(["driver"]),
    async (req: Request, res: Response) => {
        const { shareId } = req.params;
        const driverId = (req as any).user.id;

        const share = await RideShare.findById(shareId);
        if (!share) return res.status(404).json({ error: "Share not found" });

        // update status if expired
        if (share.status === "active" && hasRideExpired(share)) {
            await RideShare.findByIdAndUpdate(share._id, { $set: { status: "expired" } });
            return res.status(404).json({ error: "Share expired" });
        }
        if (share.status !== "active") return res.status(404).json({ error: "Share inactive" });

        const ok = await ensureAcl(share as any, driverId);
        if (!ok) return res.status(403).json({ error: "Forbidden" });

        const ride = await Ride.findById(share.rideId).lean();
        if (!ride) return res.status(404).json({ error: "Ride not found" });

        return res.json({
            ride: sanitizeRideForDriver(ride),
            share: {
                visibility: share.visibility,
                expiresAt: share.expiresAt,
                maxClaims: share.maxClaims ?? null,
                status: share.status,
            },
        });
    }
);

/**
 * @openapi
 * /ride-shares/{shareId}/claim:
 *   post:
 *     summary: Claim a ride via share (driver)
 *     tags: [RideShares]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: shareId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *     responses:
 *       200:
 *         description: Claimed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 rideId: { type: string }
 *                 assignedDriverId: { type: string }
 *       403: { description: Forbidden / ACL }
 *       404: { description: Not found / expired / inactive }
 *       409: { description: Already assigned / maxClaims reached }
 */
router.post(
    "/ride-shares/:shareId([0-9a-fA-F]{24})/claim",
    requireAuth,
    requireRole(["driver"]),
    async (req: Request, res: Response) => {
        const { shareId } = req.params;
        const driverId = (req as any).user.id;

        const share = await RideShare.findById(shareId);
        if (!share) return res.status(404).json({ error: "Share not found" });

        // expiry/status
        if (share.status === "active" && hasRideExpired(share)) {
            share.status = "expired";
            await share.save();
            return res.status(404).json({ error: "Share expired" });
        }
        if (share.status !== "active") return res.status(404).json({ error: "Share inactive" });

        if (!(await ensureAcl(share, driverId))) return res.status(403).json({ error: "Forbidden" });

        // optional maxClaims gate
        if (share.maxClaims && share.claimsCount >= share.maxClaims) {
            share.status = "closed";
            await share.save();
            return res.status(409).json({ error: "Max claims reached" });
        }

        // atomic assign if unassigned
        const ride = await Ride.findOneAndUpdate(
            { _id: share.rideId, assignedDriverId: { $in: [null, undefined] }, status: { $ne: "completed" } },
            { $set: { assignedDriverId: driverId, status: "assigned" } },
            { new: true }
        );

        if (!ride) {
            // either already assigned or completed
            return res.status(409).json({ error: "Ride already assigned or closed" });
        }

        // increment claims; close if limit reached
        share.claimsCount += 1;
        if (share.maxClaims && share.claimsCount >= share.maxClaims) {
            share.status = "closed";
        }
        await share.save();

        return res.json({ status: "claimed", rideId: String(ride._id), assignedDriverId: driverId });
    }
);

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
router.delete(
    "/ride-shares/:shareId",
    requireAuth,
    requireRole(["dispatcher", "admin"]),
    async (req: Request, res: Response) => {
        const { shareId } = req.params;

        const share = await RideShare.findOne({ shareId }).lean();
        if (!share) return res.status(404).json({ error: "Share not found" });

        // If already revoked, respond idempotently
        if (share.status === "revoked") {
            return res.json({
                shareId: share.shareId,
                rideId: String(share.rideId),
                status: "revoked",
                revokedAt: share.revokedAt ?? new Date(0).toISOString(),
            });
        }

        // Update to revoked
        const updated = await RideShare.findOneAndUpdate(
            { shareId },
            { $set: { status: "revoked", revokedAt: new Date() } },
            { new: true }
        ).lean();

        return res.json({
            shareId: updated!.shareId,
            rideId: String(updated!.rideId),
            status: "revoked",
            revokedAt: updated!.revokedAt,
        });
    }
);

export default router;
