import { Router, Request, Response } from "express";
import mongoose, {FilterQuery, Types} from "mongoose";
import {requireAuth, requireRole} from "../lib/auth";
import {assertCanAccessRide, rideScopeFilter} from "../lib/rideAuthz";
import Ride from "../models/ride.model";
import User from "../models/user.model";
import { RideShare} from "../models/rideShare.model";
import Group from "../models/group.model";
import {RideClaim} from "../models/rideClaim.model";

const router = Router();
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";
const isObjectId = (v: any) => Types.ObjectId.isValid(String(v));

function sanitizeRideForDriver(ride: any) {
    const {
        _id, from, to, datetime, type, status,
        fromLocation, toLocation, customer,
        payment, assignedDriverId, distance, notes
    } = ride;
    return {
        _id,
        from,
        to,
        datetime,
        type,
        status,
        fromLocation,
        toLocation,
        distance,
        notes, // keep or drop depending on your policy
        customer: customer ? { name: customer.name || "", phone: customer.phone || "" } : undefined,
        payment: payment
            ? { method: payment.method || "", amountCents: payment.amountCents ?? null, paid: !!payment.paid }
            : undefined,
        assignedDriverId,
    };
}

function buildRideFilters(req: Request) {
    const {
        status,          // string | string[]
        fromDate,        // ISO string
        toDate,          // ISO string
        dateField = "datetime", // which field to use for date filtering
        q,               // simple text match against from/to
        assigned,        // "true" | "false"
    } = req.query as Record<string, string | undefined>;

    const filters: any = {};

    // status filter (single or multiple)
    if (status) {
        const list = Array.isArray(status) ? status : String(status).split(",");
        filters.status = { $in: list };
    }

    // date range on chosen field (defaults to ride.datetime)
    if (fromDate || toDate) {
        filters[dateField] = {};
        if (fromDate) filters[dateField].$gte = new Date(fromDate!);
        if (toDate) {
            // include the whole 'to' day if only a date is provided
            const end = new Date(toDate!);
            filters[dateField].$lte = end;
        }
    }

    // text query on from/to
    if (q && q.trim()) {
        const rx = new RegExp(q.trim(), "i");
        filters.$or = [{ from: rx }, { to: rx }];
    }

    // assigned flag
    if (assigned === "true") {
        filters.assignedDriverId = { $ne: null };
    } else if (assigned === "false") {
        filters.assignedDriverId = { $in: [null, undefined] };
    }

    return filters;
}

function getPaging(req: Request) {
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "20"), 10)));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}

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
router.get("/",
    requireAuth,
    requireRole(["driver", "dispatcher", "admin"]),
    async (req: Request, res: Response) => {
    const user = (req as any).user;
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
    const sortDirParam = String(req.query.sort || "asc").toLowerCase();
    const sortDir: 1 | -1 = sortDirParam === "asc" ? 1 : -1;
    const sortByParam = String(req.query.sortBy || "createdAt");
    const sortField = sortByParam === "datetime" ? "datetime" : "createdAt";
    const filter: any = {};

    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;

    // Date range
    if (req.query.from || req.query.to) {
        filter.datetime = {};
        if (req.query.from) filter.datetime.$gte = new Date(String(req.query.from));
        if (req.query.to) filter.datetime.$lte = new Date(String(req.query.to));
    }

    // Driver filter
    if (req.query.driverId && isObjectId(req.query.driverId)) {
        const driverId = new Types.ObjectId(String(req.query.driverId));
        const includeClaimed = String(req.query.includeClaimed || "false").toLowerCase() === "true";
        filter.$or = includeClaimed
            ? [{ assignedDriverId: driverId }, { queue: driverId }]
            : [{ assignedDriverId: driverId }];
    }
    const scopedFilter = { ...filter, ...rideScopeFilter(user) };
    const total = await Ride.countDocuments(scopedFilter);
    const items = await Ride.find(scopedFilter)
        .sort({ [sortField]: sortDir })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("creatorId", "name email phone")
        .lean();

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
 *             required: [from, to, datetime]
 *             properties:
 *               creatorId: { type: string, description: "Dispatcher/User ID" }
 *               customer: {
 *                 type: object,
 *                 properties: {
 *                   name:  { type: string },
 *                   phone: { type: string }
 *                 }
 *               }
 *               distance: { type: number }
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
router.post("/",
    requireAuth,
    requireRole(["driver", "dispatcher", "admin"]),
    async (req: Request, res: Response) => {
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
            customer: body.customer ? {
                name: String(body.customer.name || "").trim(),
                phone: body.customer.phone ? String(body.customer.phone).trim() : undefined,
            } : undefined,
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
            geocodedAt: body.geocodedAt,
            payment: body.payment,
            distance: body.distance,
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
router.get("/:id([0-9a-fA-F]{24})",
    requireAuth,
    requireRole(["driver", "dispatcher", "admin"]),
    async (req: Request, res: Response) => {
    const user = (req as any).user;
    const ride = await Ride.findById(req.params.id)
            .populate("creatorId", "name email phone");
    try {
        assertCanAccessRide(user, ride);
    } catch (e: any) {
        return res.status(e.status || 403).json({ error: e.message || "Forbidden" });
    }

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
router.put("/:id([0-9a-fA-F]{24})",
    requireAuth,
    requireRole(["driver", "dispatcher", "admin"]),
    async (req: Request, res: Response) => {
    const id = req.params.id;
    const b = req.body || {};
    const user = (req as any).user;

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

    try {
        assertCanAccessRide(user, set);
    } catch (e: any) {
        return res.status(e.status || 403).json({ error: e.message || "Forbidden" });
    }

    if (set.creatorId && !isObjectId(set.creatorId)) delete set.creatorId;
    if (set.clientId && !isObjectId(set.clientId)) delete set.clientId;
    if (set.assignedDriverId && !isObjectId(set.assignedDriverId)) delete set.assignedDriverId;
    if (set.datetime) set.datetime = new Date(set.datetime);

    const ride = await Ride.findByIdAndUpdate(id, { $set: set }, { new: true });

    if (!ride) return res.status(404).json({ error: "Ride not found" });
    res.json(ride);
});

/**
 * @openapi
 * /rides/{id}:
 *   patch:
 *     summary: Partially update a ride
 *     description: >
 *       Update selected fields of an existing ride. Only the ride creator, an admin,
 *       or a dispatcher are allowed to modify a ride (according to your access checks).
 *     tags: [Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Ride ID
 *         schema:
 *           type: string
 *           pattern: "^[0-9a-fA-F]{24}$"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: >
 *               Only the listed fields are accepted; other fields in the payload are ignored.
 *             properties:
 *               from:
 *                 type: string
 *                 description: Pickup address/label
 *               to:
 *                 type: string
 *                 description: Dropoff address/label
 *               stops:
 *                 type: array
 *                 description: Optional intermediate stop labels
 *                 items:
 *                   type: string
 *               datetime:
 *                 type: string
 *                 format: date-time
 *                 description: Scheduled date and time of the ride (ISO 8601)
 *               type:
 *                 type: string
 *                 description: Ride type (e.g. "reservation" or "asap")
 *               assignedDriverId:
 *                 type: string
 *                 nullable: true
 *                 description: User ID of the assigned driver
 *               coveredVisible:
 *                 type: boolean
 *                 description: Whether the ride is visible in covered views
 *               status:
 *                 type: string
 *                 description: Ride status
 *               notes:
 *                 type: string
 *                 description: Internal notes
 *               fromLocation:
 *                 type: object
 *                 description: GeoJSON point for pickup
 *                 properties:
 *                   type:
 *                     type: string
 *                     example: "Point"
 *                   coordinates:
 *                     type: array
 *                     minItems: 2
 *                     maxItems: 2
 *                     items:
 *                       type: number
 *                     description: "[longitude, latitude]"
 *               toLocation:
 *                 type: object
 *                 description: GeoJSON point for dropoff
 *                 properties:
 *                   type:
 *                     type: string
 *                     example: "Point"
 *                   coordinates:
 *                     type: array
 *                     minItems: 2
 *                     maxItems: 2
 *                     items:
 *                       type: number
 *                     description: "[longitude, latitude]"
 *               stopLocations:
 *                 type: array
 *                 description: GeoJSON points for intermediate stops
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       example: "Point"
 *                     coordinates:
 *                       type: array
 *                       minItems: 2
 *                       maxItems: 2
 *                       items:
 *                         type: number
 *                       description: "[longitude, latitude]"
 *               payment:
 *                 type: object
 *                 description: Payment details
 *                 properties:
 *                   amountCents:
 *                     type: number
 *                     description: Total fare in cents
 *                   method:
 *                     type: string
 *                     description: Payment method identifier
 *                   paid:
 *                     type: boolean
 *                     description: Whether the ride has been paid by the customer
 *                   driverPaid:
 *                     type: boolean
 *                     description: Whether the driver has been settled
 *                   driverShareCents:
 *                     type: number
 *                     description: Driver's share in cents
 *     responses:
 *       200:
 *         description: Updated ride
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Ride"
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       403:
 *         description: Forbidden – user is not allowed to modify this ride
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       404:
 *         description: Ride not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.patch("/:id([0-9a-fA-F]{24})",
    requireAuth,
    requireRole(["driver", "dispatcher", "admin"]),
    async (req: Request, res: Response) => {
    const id = req.params.id;
    const b = req.body || {};
    const user = (req as any).user;
    const set: any = {};
    const allow = [
        "from","to","stops","datetime","type",
        "assignedDriverId","coveredVisible","status","notes",
        "fromLocation","toLocation","stopLocations",
        "payment"
    ];
    for (const k of allow) if (k in b) set[k] = b[k];
    if (set.datetime) set.datetime = new Date(set.datetime);
    try {
        assertCanAccessRide(user, set);
    } catch (e: any) {
        return res.status(e.status || 403).json({ error: e.message || "Forbidden" });
    }
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
router.delete("/:id([0-9a-fA-F]{24})",
    requireAuth,
    requireRole(["driver", "dispatcher", "admin"]),
    async (req: Request, res: Response) => {
    const ride = await Ride.findById(req.params.id);
    const user = (req as any).user;
    try {
        assertCanAccessRide(user, ride);
    } catch (e: any) {
        return res.status(e.status || 403).json({ error: e.message || "Forbidden" });
    }
    const deleted = await Ride.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Ride not found" });
    res.status(204).end();
});

/* ==================================================================== */
/* ============= DISPATCHER/ADMIN: list claims for a ride ============= */
/* ==================================================================== */

/**
 * @openapi
 * /rides/{id}/claims:
 *   get:
 *     summary: List claims for a ride
 *     description: Returns all claims (queued/approved/rejected/withdrawn) for a given ride.
 *     tags: [Rides]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: "^[0-9a-fA-F]{24}$"
 *         description: Mongo ObjectId of the Ride.
 *     responses:
 *       200:
 *         description: Claims list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   claimId:   { type: string }
 *                   status:    { type: string, enum: [queued, approved, rejected, withdrawn] }
 *                   driverId:  { type: string }
 *                   shareId:   { type: string, nullable: true }
 *                   createdAt: { type: string, format: date-time }
 */
router.get(
    "/:id([0-9a-fA-F]{24})/claims",
    requireAuth,
    requireRole(["driver", "dispatcher", "admin"]),
    async (req: Request, res: Response) => {
        const { id } = req.params;

        const claims = await (await RideClaim.find({ rideId: id }).sort({ createdAt: 1 }).lean()).map((c) => ({
            claimId: String(c._id),
            status: c.status,
            driverId: String(c.driverId),
            shareId: c.shareId ? String(c.shareId) : null,
            createdAt: c.createdAt,
        }));

        return res.json(claims);
    }
);

/* ==================================================================== */
/* ========= DISPATCHER/ADMIN: approve one claim and assign ride ====== */
/* ==================================================================== */

/**
 * @openapi
 * /rides/{rideId}/claims/{claimId}/approve:
 *   post:
 *     summary: Approve a driver's claim for a ride (assigns ride, rejects others, closes shares)
 *     tags: [RideClaims]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: claimId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Ride assigned to the approved driver
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean }
 *                 status: { type: string, enum: [assigned] }
 *                 rideId: { type: string }
 *                 assignedDriverId: { type: string }
 *       404: { description: Claim not found }
 *       409:
 *         description: Ride already assigned/closed or claim not in a queueable state
 */
router.post(
    "/:rideId([0-9a-fA-F]{24})/claims/:claimId([0-9a-fA-F]{24})/approve",
    requireAuth,
    requireRole(["driver", "dispatcher", "admin"]),
    async (req: Request, res: Response) => {
        const { rideId, claimId } = req.params;

        // 1) Load the claim and validate state
        const claim = await RideClaim.findOne({ _id: claimId, rideId }).lean();
        if (!claim) return res.status(404).json({ error: "Claim not found" });
        if (claim.status !== "queued") {
            return res.status(409).json({ error: "Claim is not queued" });
        }

        // 2) Assign the ride atomically if still unassigned and not completed
        const ride = await Ride.findOneAndUpdate(
            {
                _id: rideId,
                assignedDriverId: { $in: [null, undefined] },
                status: { $ne: "completed" },
            },
            {
                $set: {
                    assignedDriverId: claim.driverId,
                    status: "assigned",
                },
            },
            { new: true }
        ).lean();

        if (!ride) {
            return res
                .status(409)
                .json({ error: "Ride already assigned or closed" });
        }

        // 3) Mark this claim approved
        await RideClaim.updateOne(
            { _id: claimId, status: "queued" },
            { $set: { status: "approved", approvedAt: new Date() } }
        );

        // 4) Reject other queued claims for the same ride
        await RideClaim.updateMany(
            { rideId, _id: { $ne: claimId }, status: "queued" },
            { $set: { status: "rejected", rejectedAt: new Date() } }
        );

        // 5) Close any active shares for this ride (prevent new requests)
        await RideShare.updateMany(
            { rideId, status: "active" },
            { $set: { status: "closed" } }
        );

        return res.json({
            ok: true,
            status: "assigned",
            rideId: String(rideId),
            assignedDriverId: String(claim.driverId),
        });
    }
);

/* ==================================================================== */
/* ============= DISPATCHER/ADMIN: reject a queued claim ============== */
/* ==================================================================== */

/**
 * @openapi
 * /rides/{id}/claims/{claimId}/reject:
 *   post:
 *     summary: Reject a queued claim
 *     tags: [Rides]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: "^[0-9a-fA-F]{24}$"
 *         description: Ride ID (Mongo ObjectId).
 *       - in: path
 *         name: claimId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: "^[0-9a-fA-F]{24}$"
 *         description: Claim ID (Mongo ObjectId).
 *     responses:
 *       200:
 *         description: Claim rejected
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean }
 *       404: { description: Claim not found }
 *       409: { description: Claim is not queued }
 */
router.post(
    "/:id([0-9a-fA-F]{24})/claims/:claimId([0-9a-fA-F]{24})/reject",
    requireAuth,
    requireRole(["driver", "dispatcher", "admin"]),
    async (req: Request, res: Response) => {
        const { id, claimId } = req.params;

        const claim = await RideClaim.findOne({ _id: claimId, rideId: id });
        if (!claim) return res.status(404).json({ error: "Claim not found" });
        if (claim.status !== "queued") return res.status(409).json({ error: "Claim is not queued" });

        claim.status = "rejected";
        await claim.save();

        return res.json({ ok: true });
    }
);

/* ==================================================================== */
/* ==================== DRIVER: withdraw own claim ==================== */
/* ==================================================================== */

/**
 * @openapi
 * /rides/{id}/claims/{claimId}:
 *   delete:
 *     summary: Withdraw a queued claim (driver)
 *     tags: [Rides]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: "^[0-9a-fA-F]{24}$"
 *         description: Ride ID (Mongo ObjectId).
 *       - in: path
 *         name: claimId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: "^[0-9a-fA-F]{24}$"
 *         description: Claim ID (Mongo ObjectId).
 *     responses:
 *       200:
 *         description: Claim withdrawn
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean }
 *       404: { description: Claim not found }
 *       409: { description: Only queued claims can be withdrawn }
 */
router.delete(
    "/:id([0-9a-fA-F]{24})/claims/:claimId([0-9a-fA-F]{24})",
    requireAuth,
    requireRole(["driver"]),
    async (req: Request, res: Response) => {
        const { id, claimId } = req.params;
        const driverId = (req as any).user.id;

        const claim = await RideClaim.findOne({ _id: claimId, rideId: id, driverId });
        if (!claim) return res.status(404).json({ error: "Claim not found" });
        if (claim.status !== "queued") return res.status(409).json({ error: "Only queued claims can be withdrawn" });

        claim.status = "withdrawn";
        await claim.save();

        return res.json({ ok: true });
    }
);

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
router.post("/:id([0-9a-fA-F]{24})/assign",
    requireAuth,
    requireRole(["driver", "dispatcher", "admin"]),
    async (req: Request, res: Response) => {
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
router.post("/:id([0-9a-fA-F]{24})/status",
    requireAuth,
    requireRole(["driver", "dispatcher", "admin"]),
    async (req: Request, res: Response) => {
    const { status } = req.body as { status: string };
    const ride = await Ride.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true });
    if (!ride) return res.status(404).json({ error: "Ride not found" });
    res.json({ ok: true, ride });
});


/**
 * @openapi
 * /rides/{id}/share:
 *   post:
 *     summary: Create a ride share (link/ACL)
 *     tags: [Rides]
 *     security: [{ bearerAuth: [] }]
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
 *             required: [visibility]
 *             properties:
 *               visibility: { type: string, enum: ["public","groups","drivers"] }
 *               groupIds:
 *                 type: array
 *                 items: { type: string }
 *               driverIds:
 *                 type: array
 *                 items: { type: string }
 *               expiresAt: { type: string, format: date-time, nullable: true }
 *               maxClaims: { type: integer, minimum: 1 }
 *               syncQueue: { type: boolean, default: true }
 *     responses:
 *       201:
 *         description: Share created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 shareId: { type: string }
 *                 url: { type: string }
 *                 visibility: { type: string }
 *                 expiresAt: { type: string, format: date-time, nullable: true }
 *                 maxClaims: { type: integer, nullable: true }
 *                 status: { type: string }
 *       400: { description: Validation error }
 *       404: { description: Ride not found }
 *       409: { description: Ride completed / cannot share }
 */
router.post(
    "/:id([0-9a-fA-F]{24})/share",
    requireAuth,
    requireRole(["driver", "dispatcher", "admin"]),
    async (req: Request, res: Response) => {
        const { id } = req.params;
        const { visibility, groupIds, driverIds, expiresAt, maxClaims, syncQueue = true } = req.body || {};
        const ride = await Ride.findById(id).lean();
        if (!ride) return res.status(404).json({ error: "Ride not found" });
        if (["completed", "clear"].includes(ride.status)) {
            return res.status(409).json({ error: "Ride is already completed/closed" });
        }

        // validate vis + targets
        if (!["public", "groups", "drivers"].includes(visibility)) {
            return res.status(400).json({ error: "Invalid visibility" });
        }
        if (visibility === "groups" && (!Array.isArray(groupIds) || groupIds.length === 0)) {
            return res.status(400).json({ error: "groupIds required for groups visibility" });
        }
        if (visibility === "drivers" && (!Array.isArray(driverIds) || driverIds.length === 0)) {
            return res.status(400).json({ error: "driverIds required for drivers visibility" });
        }

        // optional: pre-validate groups/drivers exist
        if (visibility === "groups") {
            const cnt = await Group.countDocuments({ _id: { $in: groupIds } });
            if (cnt !== groupIds.length) return res.status(400).json({ error: "Some groups not found" });
        }
        if (visibility === "drivers") {
            const cnt = await User.countDocuments({ _id: { $in: driverIds }, roles: { $in: ["driver"] } });
            if (cnt !== driverIds.length) return res.status(400).json({ error: "Some drivers not found" });
        }

        const share = await RideShare.create({
            rideId: id,
            visibility,
            groupIds,
            driverIds,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            maxClaims: maxClaims ?? null,
            syncQueue: !!syncQueue,
            status: "active",
            createdBy: (req as any).user.id,
        });

        // optionally sync queue: for drivers visibility, set queue to those drivers (keep existing order)
        if (share.syncQueue && visibility === "drivers" && driverIds?.length) {
            await Ride.findByIdAndUpdate(id, { $set: { queue: driverIds } });
        }

        const url = `${APP_BASE_URL}/ride-share/${share._id}`;
        return res.status(201).json({
            shareId: share._id,
            url,
            visibility: share.visibility,
            expiresAt: share.expiresAt,
            maxClaims: share.maxClaims ?? null,
            status: share.status,
        });
    }
);

/**
 * @openapi
 * /rides/{id}/share:
 *   get:
 *     summary: Get shares for a ride (active or revoked)
 *     tags: [Rides]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         description: Filter by status. Defaults to "active".
 *         required: false
 *         schema:
 *           type: string
 *           enum: [active, revoked]
 *           default: active
 *     responses:
 *       200:
 *         description: Shares for the requested status
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   shareId:     { type: string }
 *                   visibility:  { type: string }
 *                   expiresAt:   { type: string, format: date-time, nullable: true }
 *                   maxClaims:   { type: integer, nullable: true }
 *                   claimsCount: { type: integer }
 *                   status:      { type: string, enum: [active, revoked] }
 *                   revokedAt:   { type: string, format: date-time, nullable: true }
 *       404:
 *         description: None
 */
router.get(
    "/:id([0-9a-fA-F]{24})/share",
    requireAuth,
    requireRole(["driver", "dispatcher", "admin"]),
    async (req: Request, res: Response) => {
        const { id } = req.params;
        const user = (req as any).user;
        const ride = await Ride.findById(id);
        try {
            assertCanAccessRide(user, ride);
        } catch (e: any) {
            return res.status(e.status || 403).json({ error: e.message || "Forbidden" });
        }

        const raw = String(req.query.status ?? "active");
        const status = raw === "revoked" ? "revoked" : "active";

        const shares = await RideShare.find({ rideId: id, status })
            .sort({ createdAt: -1 })
            .lean();

        if (!shares.length) {
            return res
                .status(404)
                .json({ error: `No ${status} shares` });
        }

        return res.json(
            shares.map((s) => ({
                shareId: String(s._id),
                visibility: s.visibility,
                expiresAt: s.expiresAt ?? null,
                maxClaims: typeof s.maxClaims === "number" ? s.maxClaims : null,
                claimsCount: s.claimsCount ?? 0,
                driverIds: s.driverIds,
                groupIds: s.groupIds,
                status: s.status,
                revokedAt: s.revokedAt ?? null,
            }))
        );
    }
);

/**
 * @openapi
 * /rides/{id}/share:
 *   delete:
 *     summary: Revoke all active shares for a ride
 *     tags: [Rides]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Revoked, content: { application/json: { schema: { type: object, properties: { status: { type: string } } } } } }
 *       404: { description: None }
 */
router.delete(
    "/:id([0-9a-fA-F]{24})/share",
    requireAuth,
    requireRole(["dispatcher", "admin"]),
    async (req: Request, res: Response) => {
        const { id } = req.params;
        const { modifiedCount } = await RideShare.updateMany(
            { rideId: id, status: "active" },
            { $set: { status: "revoked" } }
        );
        if (!modifiedCount) return res.status(404).json({ error: "No active shares" });
        return res.json({ status: "revoked" });
    }
);

/**
 * @openapi
 * /rides/my-created:
 *   get:
 *     summary: List rides created by me (driver/dispatcher/admin)
 *     tags: [Rides]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string, description: "Comma-separated statuses" }
 *       - in: query
 *         name: fromDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: toDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: dateField
 *         schema: { type: string, enum: ["datetime","createdAt","updatedAt"], default: "datetime" }
 *       - in: query
 *         name: q
 *         schema: { type: string, description: "Search in from/to" }
 *       - in: query
 *         name: assigned
 *         schema: { type: string, enum: ["true","false"] }
 *     responses:
 *       200:
 *         description: Paginated list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items: { type: array, items: { $ref: '#/components/schemas/Ride' } }
 *                 page: { type: integer }
 *                 limit: { type: integer }
 *                 total: { type: integer }
 *                 pages: { type: integer }
 *       401: { description: Unauthorized }
 */
router.get("/my-created", requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { page, limit, skip } = getPaging(req);
    const filters = buildRideFilters(req);

    // Only rides created by me
    filters.creatorId = new Types.ObjectId(user.id); // <— ensure field matches your model

    const [items, total] = await Promise.all([
        Ride.find(filters).sort({ datetime: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
        Ride.countDocuments(filters),
    ]);

    return res.json({
        items,
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
    });
});

/**
 * @openapi
 * /rides/my-assigned:
 *   get:
 *     summary: List rides assigned to the authenticated driver
 *     description: Returns rides where `assignedDriverId` equals the current user. Supports basic filtering and cursor pagination.
 *     tags: [Rides]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         description: Optional comma-separated list of ride statuses to include (e.g. `assigned,on_my_way,completed`)
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         description: ISO date-time (inclusive) filter on `datetime` (pickup time) lower bound
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         description: ISO date-time (exclusive) filter on `datetime` upper bound
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: limit
 *         description: Page size (max 100)
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *       - in: query
 *         name: cursor
 *         description: Cursor for pagination; pass the last seen ride `_id` to fetch the next page
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A page of rides assigned to the driver
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
 *                       _id: { type: string }
 *                       from: { type: string }
 *                       to: { type: string }
 *                       datetime: { type: string, format: date-time }
 *                       type: { type: string }
 *                       status: { type: string }
 *                       fromLocation: { type: object, nullable: true }
 *                       toLocation: { type: object, nullable: true }
 *                       distance: { type: number, nullable: true }
 *                       notes: { type: string, nullable: true }
 *                       customer:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           name: { type: string }
 *                           phone: { type: string }
 *                       payment:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           method: { type: string }
 *                           amountCents: { type: integer, nullable: true }
 *                           paid: { type: boolean }
 *                       assignedDriverId: { type: string }
 *                 nextCursor:
 *                   type: string
 *                   nullable: true
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden (not a driver) }
 */
router.get(
    "/my-assigned",
    requireAuth,
    requireRole(["driver"]),
    async (req: Request, res: Response) => {
        const driverId = (req as any).user.id as string;

        const rawLimit = Number(req.query.limit ?? 20);
        const limit = Math.min(Math.max(rawLimit, 1), 100);

        const statusParam = String(req.query.status ?? "").trim();
        const statusList = statusParam
            ? statusParam.split(",").map((s) => s.trim()).filter(Boolean)
            : [];

        const from = req.query.from ? new Date(String(req.query.from)) : null;
        const to = req.query.to ? new Date(String(req.query.to)) : null;

        const cursor = req.query.cursor ? String(req.query.cursor) : null;

        const q: FilterQuery<any> = {
            assignedDriverId: driverId,
        };

        if (statusList.length) {
            q.status = { $in: statusList };
        }

        if (from || to) {
            q.datetime = {};
            if (from && !Number.isNaN(from.getTime())) (q.datetime as any).$gte = from;
            if (to && !Number.isNaN(to.getTime())) (q.datetime as any).$lt = to;
            if (Object.keys(q.datetime as any).length === 0) delete q.datetime;
        }

        // Cursor pagination (descending by _id)
        if (cursor && Types.ObjectId.isValid(cursor)) {
            q._id = { $lt: new Types.ObjectId(cursor) };
        }

        const docs = await Ride.find(q)
            .sort({ _id: -1 })
            .limit(limit + 1)
            .lean();

        const hasMore = docs.length > limit;
        const page = hasMore ? docs.slice(0, limit) : docs;
        const nextCursor = hasMore ? String(page[page.length - 1]._id) : null;

        const items = page.map(sanitizeRideForDriver);

        return res.json({ items, nextCursor });
    }
);

export default router;
