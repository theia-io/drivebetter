import { Router, Request, Response } from "express";
import { Types } from "mongoose";
import Ride from "../models/ride.model";
import User from "../models/user.model";

const router = Router();

const isObjectId = (v: any) => Types.ObjectId.isValid(String(v));

/**
 * @openapi
 * /rides:
 *   get:
 *     summary: List rides (filterable, paginated)
 *     tags: [Rides]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [unassigned, assigned, on_my_way, on_location, pob, clear, completed] }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [reservation, asap] }
 *       - in: query
 *         name: driverId
 *         description: Filter by assigned driver
 *         schema: { type: string }
 *       - in: query
 *         name: includeClaimed
 *         description: Also include rides where driver is in claim queue
 *         schema: { type: boolean, default: false }
 *       - in: query
 *         name: from
 *         description: ISO date-time inclusive lower bound
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         description: ISO date-time inclusive upper bound
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: sort
 *         description: Sort by datetime asc|desc
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Paged list
 */
router.get("/", async (req: Request, res: Response) => {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
    const sortDir = String(req.query.sort || "desc").toLowerCase() === "asc" ? 1 : -1;

    const q: any = {};
    if (req.query.status) q.status = req.query.status;
    if (req.query.type) q.type = req.query.type;

    // Date range
    if (req.query.from || req.query.to) {
        q.datetime = {};
        if (req.query.from) q.datetime.$gte = new Date(String(req.query.from));
        if (req.query.to) q.datetime.$lte = new Date(String(req.query.to));
    }

    // Driver filter
    if (req.query.driverId && isObjectId(req.query.driverId)) {
        const driverId = new Types.ObjectId(String(req.query.driverId));
        const includeClaimed = String(req.query.includeClaimed || "false").toLowerCase() === "true";
        q.$or = includeClaimed
            ? [{ assignedDriverId: driverId }, { queue: driverId }]
            : [{ assignedDriverId: driverId }];
    }

    const total = await Ride.countDocuments(q);
    const items = await Ride.find(q)
        .sort({ datetime: sortDir })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
});

/**
 * @openapi
 * /rides:
 *   post:
 *     summary: Create ride
 *     tags: [Rides]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [from, to, datetime]
 *             properties:
 *               creatorId: { type: string, description: "Dispatcher/User ID" }
 *               clientId: { type: string }
 *               driverEmail: { type: string, format: email, description: "Assign by driver email (optional)" }
 *               assignedDriverId: { type: string, description: "Assign by driver id (optional)" }
 *               from: { type: string }
 *               to: { type: string }
 *               stops: { type: array, items: { type: string } }
 *               datetime: { type: string, format: date-time }
 *               type: { type: string, enum: [reservation, asap], description: "If omitted, inferred by datetime" }
 *               status:
 *                 type: string
 *                 enum: [unassigned, assigned, on_my_way, on_location, pob, clear, completed]
 *               notes: { type: string }
 *               coveredVisible: { type: boolean, default: true }
 *               geo (optional)
 *               fromLocation:
 *                 type: object
 *                 properties:
 *                   type: { type: string, enum: [Point] }
 *                   coordinates:
 *                     type: array
 *                     minItems: 2
 *                     maxItems: 2
 *                     items: { type: number }
 *               toLocation:
 *                 type: object
 *                 properties:
 *                   type: { type: string, enum: [Point] }
 *                   coordinates:
 *                     type: array
 *                     minItems: 2
 *                     maxItems: 2
 *                     items: { type: number }
 *     responses:
 *       201: { description: Created }
 *       400: { description: Validation error }
 *       404: { description: Driver not found }
 */
router.post("/", async (req: Request, res: Response) => {
    try {
        const body = req.body || {};

        // resolve assignment
        let assignedDriverId: Types.ObjectId | null = null;
        if (body.assignedDriverId && isObjectId(body.assignedDriverId)) {
            assignedDriverId = new Types.ObjectId(body.assignedDriverId);
        } else if (body.driverEmail) {
            const driver = await User.findOne({ email: body.driverEmail, roles: "driver" }).select("_id");
            if (!driver) return res.status(404).json({ error: "driver_not_found" });
            assignedDriverId = driver._id as Types.ObjectId;
        }

        const when = new Date(body.datetime);
        const type = body.type ?? (when.getTime() > Date.now() ? "reservation" : "asap");
        const status = body.status ?? (assignedDriverId ? "assigned" : "unassigned");

        const doc = await Ride.create({
            creatorId: body.creatorId && isObjectId(body.creatorId) ? body.creatorId : undefined,
            clientId: body.clientId && isObjectId(body.clientId) ? body.clientId : undefined,
            from: body.from,
            to: body.to,
            stops: Array.isArray(body.stops) ? body.stops : [],
            datetime: when,
            type,
            queue: [],
            assignedDriverId,
            coveredVisible: body.coveredVisible ?? true,
            status,
            notes: body.notes,
            fromLocation: body.fromLocation,
            toLocation: body.toLocation,
            stopLocations: body.stopLocations,
            fromPlaceId: body.fromPlaceId,
            toPlaceId: body.toPlaceId,
            geocoder: body.geocoder,
            geoAccuracy: body.geoAccuracy,
            geocodedAt: body.geocodedAt,
            payment: body.payment,
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
router.get("/:id([0-9a-fA-F]{24})", async (req: Request, res: Response) => {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ error: "Ride not found" });
    res.json(ride);
});

/**
 * @openapi
 * /rides/{id}:
 *   put:
 *     summary: Replace ride
 *     tags: [Rides]
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
 *             $ref: '#/components/schemas/RidePutBody'
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 *   patch:
 *     summary: Update ride (partial)
 *     tags: [Rides]
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
 *             $ref: '#/components/schemas/RidePatchBody'
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 *
 * components:
 *   schemas:
 *     RidePutBody:
 *       type: object
 *       properties:
 *         creatorId: { type: string }
 *         clientId: { type: string }
 *         from: { type: string }
 *         to: { type: string }
 *         stops: { type: array, items: { type: string } }
 *         datetime: { type: string, format: date-time }
 *         type: { type: string, enum: [reservation, asap] }
 *         assignedDriverId: { type: string }
 *         coveredVisible: { type: boolean }
 *         status: { type: string, enum: [unassigned, assigned, on_my_way, on_location, pob, clear, completed] }
 *         notes: { type: string }
 *         fromLocation:
 *           type: object
 *           properties:
 *             type: { type: string, enum: [Point] }
 *             coordinates: { type: array, minItems: 2, maxItems: 2, items: { type: number } }
 *         toLocation:
 *           type: object
 *           properties:
 *             type: { type: string, enum: [Point] }
 *             coordinates: { type: array, minItems: 2, maxItems: 2, items: { type: number } }
 *         stopLocations:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               type: { type: string, enum: [Point] }
 *               coordinates: { type: array, minItems: 2, maxItems: 2, items: { type: number } }
 *         payment:
 *           type: object
 *           properties:
 *             method: { type: string, enum: [cash, zelle, card, qr] }
 *             paid: { type: boolean }
 *             driverPaid: { type: boolean }
 *             amountCents: { type: integer, minimum: 0 }
 *     RidePatchBody:
 *       allOf:
 *         - $ref: '#/components/schemas/RidePutBody'
 */
router.put("/:id([0-9a-fA-F]{24})", async (req: Request, res: Response) => {
    const id = req.params.id;
    const b = req.body || {};

    const set: any = {};
    // whitelist fields
    const allow = [
        "creatorId","clientId","from","to","stops","datetime","type",
        "assignedDriverId","coveredVisible","status","notes",
        "fromLocation","toLocation","stopLocations",
        "fromPlaceId","toPlaceId","geocoder","geoAccuracy","geocodedAt",
        "payment"
    ];
    for (const k of allow) if (k in b) set[k] = b[k];

    if (set.creatorId && !isObjectId(set.creatorId)) delete set.creatorId;
    if (set.clientId && !isObjectId(set.clientId)) delete set.clientId;
    if (set.assignedDriverId && !isObjectId(set.assignedDriverId)) delete set.assignedDriverId;
    if (set.datetime) set.datetime = new Date(set.datetime);

    const ride = await Ride.findByIdAndUpdate(id, { $set: set }, { new: true });
    if (!ride) return res.status(404).json({ error: "Ride not found" });
    res.json(ride);
});

router.patch("/:id([0-9a-fA-F]{24})", async (req: Request, res: Response) => {
    const id = req.params.id;
    const b = req.body || {};
    const set: any = {};
    const allow = [
        "from","to","stops","datetime","type",
        "assignedDriverId","coveredVisible","status","notes",
        "fromLocation","toLocation","stopLocations",
        "payment"
    ];
    for (const k of allow) if (k in b) set[k] = b[k];
    if (set.datetime) set.datetime = new Date(set.datetime);

    const ride = await Ride.findByIdAndUpdate(id, { $set: set }, { new: true });
    if (!ride) return res.status(404).json({ error: "Ride not found" });
    res.json(ride);
});

/**
 * @openapi
 * /rides/{id}:
 *   delete:
 *     summary: Delete ride
 *     tags: [Rides]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Deleted }
 *       404: { description: Not found }
 */
router.delete("/:id([0-9a-fA-F]{24})", async (req: Request, res: Response) => {
    const deleted = await Ride.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Ride not found" });
    res.status(204).end();
});

/**
 * @openapi
 * /rides/{id}/claim:
 *   post:
 *     summary: Driver claims a ride
 *     tags: [Rides]
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
 *             required: [driverId]
 *             properties:
 *               driverId: { type: string }
 *     responses:
 *       200: { description: Claimed }
 *       404: { description: Not found }
 */
router.post("/:id([0-9a-fA-F]{24})/claim", async (req: Request, res: Response) => {
    const { driverId } = req.body as { driverId: string };
    if (!isObjectId(driverId)) return res.status(400).json({ error: "invalid_driver_id" });

    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ error: "Ride not found" });

    const oid = new Types.ObjectId(driverId);
    if (!ride.queue.map(String).includes(String(oid))) ride.queue.push(oid);
    await ride.save();

    res.json({ ok: true, queuePosition: ride.queue.findIndex((d) => String(d) === String(oid)) + 1 });
});

/**
 * @openapi
 * /rides/{id}/assign:
 *   post:
 *     summary: Assign a driver to a ride
 *     tags: [Rides]
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
 *             required: [driverId]
 *             properties:
 *               driverId: { type: string }
 *     responses:
 *       200: { description: Assigned }
 *       400: { description: Driver not found }
 *       404: { description: Ride not found }
 */
router.post("/:id([0-9a-fA-F]{24})/assign", async (req: Request, res: Response) => {
    const { driverId } = req.body as { driverId: string };
    if (!isObjectId(driverId)) return res.status(400).json({ error: "invalid_driver_id" });

    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ error: "Ride not found" });

    const driver = await User.findById(driverId);
    if (!driver) return res.status(400).json({ error: "Driver not found" });

    const oid = new Types.ObjectId(driverId);
    ride.assignedDriverId = oid;
    ride.status = "assigned";
    if (!ride.queue.map(String).includes(String(oid))) ride.queue.push(oid);

    await ride.save();
    res.json({ ok: true, ride });
});

/**
 * @openapi
 * /rides/{id}/status:
 *   post:
 *     summary: Update ride status
 *     tags: [Rides]
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [unassigned, assigned, on_my_way, on_location, pob, clear, completed]
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 */
router.post("/:id([0-9a-fA-F]{24})/status", async (req: Request, res: Response) => {
    const { status } = req.body as { status: string };
    const ride = await Ride.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true });
    if (!ride) return res.status(404).json({ error: "Ride not found" });
    res.json({ ok: true, ride });
});

export default router;
