import { Router, Request, Response } from "express";
import mongoose, { Schema, Document, Model } from "mongoose";

interface ICalendarEntry extends Document {
    userId: string;
    rideId?: string | null;
    start: Date;
    end: Date;
    conflictFlag?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const CalendarEntrySchema = new Schema<ICalendarEntry>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        rideId: { type: Schema.Types.ObjectId, ref: "Ride", default: null },
        start: { type: Date, required: true },
        end: { type: Date, required: true },
        conflictFlag: { type: Boolean, default: false }
    },
    { timestamps: true }
);

const CalendarEntry: Model<ICalendarEntry> =
    mongoose.models.CalendarEntry || mongoose.model<ICalendarEntry>("CalendarEntry", CalendarEntrySchema);

const router = Router();

/**
 * @openapi
 * /calendar:
 *   get:
 *     summary: Get calendar entries for a user
 *     tags: [Calendar]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/", async (req: Request, res: Response) => {
    const { userId, from, to } = req.query as { userId: string; from?: string; to?: string };
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const q: any = { userId };
    if (from || to) {
        q.start = {};
        if (from) q.start.$gte = new Date(from);
        if (to) q.start.$lte = new Date(to);
    }

    const items = await CalendarEntry.find(q).sort({ start: 1 });
    res.json({ items });
});

/**
 * @openapi
 * /calendar/availability:
 *   post:
 *     summary: Create availability range for a user
 *     tags: [Calendar]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, start, end]
 *             properties:
 *               userId: { type: string }
 *               start: { type: string, format: date-time }
 *               end: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Upserted
 */
router.post("/availability", async (req: Request, res: Response) => {
    const { userId, start, end } = req.body as { userId: string; start: string; end: string };
    if (!userId || !start || !end) return res.status(400).json({ error: "userId, start, end required" });

    const doc = await CalendarEntry.create({
        userId,
        start: new Date(start),
        end: new Date(end),
        conflictFlag: false
    });

    res.json({ ok: true, entry: doc });
});

export default router;
