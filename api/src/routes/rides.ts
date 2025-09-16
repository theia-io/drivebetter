import { Router, Request, Response } from "express";
import Ride from "../models/ride.model";
import User from "../models/user.model";

const router = Router();

/**
 * @openapi
 * /rides:
 *   get:
 *     summary: List rides
 *     tags: [Rides]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [reservation, asap] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/", async (req: Request, res: Response) => {
    const page = Number(req.query.page || 1);
    const limit = Math.min(Number(req.query.limit || 20), 100);
    const query: any = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.type) query.type = req.query.type;
    const total = await Ride.countDocuments(query);
    const items = await Ride.find(query)
        .sort({ datetime: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
    res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
});

/**
 * @openapi
 * /rides:
 *   post:
 *     summary: Create a ride
 *     tags: [Rides]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [from, to, datetime, type]
 *             properties:
 *               creatorId: { type: string, description: "Dispatcher/User ID" }
 *               clientId: { type: string }
 *               from: { type: string }
 *               to: { type: string }
 *               stops: { type: array, items: { type: string } }
 *               datetime: { type: string, format: date-time }
 *               type: { type: string, enum: [reservation, asap] }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Created
 */
router.post("/", async (req: Request, res: Response) => {
    try {
        const doc = await Ride.create({
            ...req.body,
            status: req.body.status || "unassigned",
            coveredVisible: req.body.coveredVisible ?? true,
        });
        res.status(201).json(doc);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /rides/{id}:
 *   get:
 *     summary: Get ride by ID
 *     tags: [Rides]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 */
router.get("/:id", async (req: Request, res: Response) => {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ error: "Ride not found" });
    res.json(ride);
});

/**
 * @openapi
 * /rides/{id}/claim:
 *   post:
 *     summary: Driver claims a ride ("I take it")
 *     tags: [Rides]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [driverId]
 *             properties:
 *               driverId: { type: string }
 *     responses:
 *       200: { description: Claimed }
 *       404: { description: Not found }
 */
router.post("/:id/claim", async (req: Request, res: Response) => {
    const { driverId } = req.body;
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ error: "Ride not found" });

    if (!ride.queue.map(String).includes(driverId)) {
        ride.queue.push(driverId);
    }
    await ride.save();
    res.json({ ok: true, queuePosition: ride.queue.findIndex((d) => String(d) === driverId) + 1 });
});

/**
 * @openapi
 * /rides/{id}/assign:
 *   post:
 *     summary: Dispatcher assigns a driver to a ride
 *     tags: [Rides]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [driverId]
 *             properties:
 *               driverId: { type: string }
 *     responses:
 *       200: { description: Assigned }
 *       404: { description: Not found }
 */
router.post("/:id/assign", async (req: Request, res: Response) => {
    const { driverId } = req.body;
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ error: "Ride not found" });

    const driver = await User.findById(driverId);
    if (!driver) return res.status(400).json({ error: "Driver not found" });

    ride.assignedDriverId = driverId;
    ride.status = "assigned";
    if (!ride.queue.map(String).includes(driverId)) {
        ride.queue.push(driverId);
    }
    await ride.save();
    res.json({ ok: true, ride });
});

/**
 * @openapi
 * /rides/{id}/status:
 *   post:
 *     summary: Update ride status (driver)
 *     tags: [Rides]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [on_my_way, on_location, pob, clear]
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 */
router.post("/:id/status", async (req: Request, res: Response) => {
    const { status } = req.body as { status: "on_my_way" | "on_location" | "pob" | "clear" };
    const ride = await Ride.findByIdAndUpdate(
        req.params.id,
        { $set: { status } },
        { new: true }
    );
    if (!ride) return res.status(404).json({ error: "Ride not found" });
    res.json({ ok: true, ride });
});

export default router;
