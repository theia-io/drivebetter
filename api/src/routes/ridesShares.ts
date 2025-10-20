import { Router, Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import Ride from "../models/ride.model";
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
    "/:shareId([0-9a-fA-F]{24})",
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
    "/:shareId([0-9a-fA-F]{24})/claim",
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
    "/:shareId",
    requireAuth,
    requireRole(["dispatcher", "admin"]),
    async (req: Request, res: Response) => {
        const { shareId } = req.params;

        const share = await RideShare.findOne({ _id: shareId }).lean();
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
            { _id: shareId },
            { $set: { status: "revoked", revokedAt: new Date() } },
            { new: true }
        ).lean();

        return res.json({
            shareId: updated!._id,
            rideId: String(updated!.rideId),
            status: "revoked",
            revokedAt: updated!.revokedAt,
        });
    }
);

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

            const items = activeShares
                .map((s) => {
                    const ride = rideMap.get(String(s.rideId));
                    if (!ride) return null;
                    return {
                        shareId: s.shareId ?? String(s._id),
                        visibility: s.visibility,
                        expiresAt: s.expiresAt,
                        maxClaims: s.maxClaims ?? null,
                        claimsCount: s.claimsCount ?? 0,
                        ride: {
                            _id: String(ride._id),
                            from: ride.from,
                            to: ride.to,
                            datetime: ride.datetime,
                            status: ride.status,
                            fromLocation: ride.fromLocation,
                            toLocation: ride.toLocation,
                            customer: ride.customer ? { name: ride.customer.name ?? "", phone: ride.customer.phone ?? "" } : undefined,
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

export default router;
