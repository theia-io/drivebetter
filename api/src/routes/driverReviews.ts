import { Router, Request, Response } from "express";
import { Types } from "mongoose";
import { requireAuth, requireRole } from "../lib/auth";
import DriverReview, { recomputeDriverRating } from "../models/driverReview.model";
import { sendPushNotificationToUser } from "@/lib/pushNotifications";
import User from "@/models/user.model";

/**
 * @openapi
 * tags:
 *   - name: DriverFeedback
 *     description: Leave and read feedback for drivers
 */
const router = Router();

/**
 * @openapi
 * /drivers-reviews/{driverId}/feedback:
 *   post:
 *     summary: Leave feedback for a driver
 *     description: Creates a feedback entry (rating 1..5, optional comment/tags). Recomputes driver's rating summary.
 *     tags: [DriverFeedback]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rideId: { type: string, nullable: true }
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               comment: { type: string }
 *               tags: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reviewId: { type: string }
 *                 driverId: { type: string }
 *                 rating: { type: integer }
 *                 comment: { type: string }
 *                 tags: { type: array, items: { type: string } }
 *                 createdAt: { type: string, format: date-time }
 *       400: { description: Validation error }
 *       403: { description: Forbidden }
 */
router.post(
    "/:driverId/feedback",
    requireAuth,
    // Adjust roles as you like. Commonly dispatcher/admin (optionally “customer” if you add such a role)
    requireRole(["dispatcher", "admin"]),
    async (req: Request, res: Response) => {
        const { driverId } = req.params;
        const { rideId, rating, comment, tags } = req.body || {};
        const reviewerId = (req as any).user.id;

        if (!Types.ObjectId.isValid(driverId)) {
            return res.status(400).json({ error: "Invalid driverId" });
        }
        if (typeof rating !== "number" || rating < 1 || rating > 5) {
            return res.status(400).json({ error: "Rating must be 1..5" });
        }
        if (rideId && !Types.ObjectId.isValid(rideId)) {
            return res.status(400).json({ error: "Invalid rideId" });
        }

        const review = await DriverReview.create({
            driverId,
            rideId: rideId || null,
            reviewerId,
            rating: Math.round(rating),
            comment: comment?.trim() || undefined,
            tags: Array.isArray(tags) ? tags.filter(Boolean) : undefined,
        });

        await recomputeDriverRating(new Types.ObjectId(driverId));

        try {
            const driver = await User.findById(driverId);
            await sendPushNotificationToUser(driver, {
                title: "New Driver Review",
                body: `You have a new review from ${reviewerId} with rating ${rating}`,
            });
        } catch (error) {
            console.error("[DriverReviews] Failed to send push notification to reviewer:", error);
        }

        return res.status(201).json({
            reviewId: String(review._id),
            driverId: String(review.driverId),
            rating: review.rating,
            comment: review.comment || null,
            tags: review.tags || [],
            createdAt: review.createdAt,
        });
    }
);

/**
 * @openapi
 * /drivers-reviews/{driverId}/feedback:
 *   get:
 *     summary: List feedback for a driver
 *     description: Returns paginated feedback entries newest first.
 *     tags: [DriverFeedback]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Page of feedback
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       reviewId: { type: string }
 *                       reviewerId: { type: string }
 *                       rideId: { type: string, nullable: true }
 *                       rating: { type: integer }
 *                       comment: { type: string, nullable: true }
 *                       tags: { type: array, items: { type: string } }
 *                       createdAt: { type: string, format: date-time }
 *                 page:  { type: integer }
 *                 limit: { type: integer }
 *                 total: { type: integer }
 *                 pages: { type: integer }
 */
router.get(
    "/:driverId/feedback",
    requireAuth,
    requireRole(["dispatcher", "admin"]), // allow drivers to see their own with a custom rule if you want
    async (req: Request, res: Response) => {
        const { driverId } = req.params;
        const page = Math.max(1, Number(req.query.page || 1));
        const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));

        if (!Types.ObjectId.isValid(driverId)) {
            return res.status(400).json({ error: "Invalid driverId" });
        }

        const q = { driverId: new Types.ObjectId(driverId) };
        const [items, total] = await Promise.all([
            DriverReview.find(q)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip((page - 1) * limit)
                .lean(),
            DriverReview.countDocuments(q),
        ]);

        res.json({
            items: items.map((r) => ({
                reviewId: String(r._id),
                reviewerId: String(r.reviewerId),
                rideId: r.rideId ? String(r.rideId) : null,
                rating: r.rating,
                comment: r.comment ?? null,
                tags: r.tags ?? [],
                createdAt: r.createdAt,
            })),
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        });
    }
);

/**
 * @openapi
 * /drivers-reviews/{driverId}/rating:
 *   get:
 *     summary: Get driver's rating summary
 *     tags: [DriverFeedback]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Rating summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ratingAvg:   { type: number }
 *                 ratingCount: { type: integer }
 */
router.get(
    "/:driverId/rating",
    requireAuth,
    requireRole(["dispatcher", "admin"]),
    async (req: Request, res: Response) => {
        const { driverId } = req.params;
        if (!Types.ObjectId.isValid(driverId)) {
            return res.status(400).json({ error: "Invalid driverId" });
        }

        // read from denormalized stats (kept in sync on create)
        const doc = await (await import("../models/driverDetails.model")).default
            .findOne({ userId: driverId })
            .select("stats.ratingAvg stats.ratingCount")
            .lean();

        res.json({
            ratingAvg: doc?.stats?.ratingAvg ?? 0,
            ratingCount: doc?.stats?.ratingCount ?? 0,
        });
    }
);

export default router;
