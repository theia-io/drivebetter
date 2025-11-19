// src/routes/driverDetails.ts
import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import DriverDetails from "../models/driverDetails.model";
import { normalizeValidationError } from "../lib/httpErrors";
import User from "../models/user.model";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: DriverDetails
 *     description: Driver profile, vehicle, capabilities and service settings
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     GeoPoint:
 *       type: object
 *       properties:
 *         type: { type: string, enum: [Point] }
 *         coordinates:
 *           type: array
 *           items: { type: number }
 *           minItems: 2
 *           maxItems: 2
 *           description: [lon, lat]
 *     DriverDocument:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         type: { type: string, enum: [license, insurance, registration, permit, other] }
 *         url: { type: string }
 *         uploadedAt: { type: string, format: date-time }
 *         expiresAt: { type: string, format: date-time, nullable: true }
 *         note: { type: string }
 *     DriverDetails:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         userId: { type: string }
 *         vehicle:
 *           type: object
 *           properties:
 *             make: { type: string }
 *             model: { type: string }
 *             year: { type: integer }
 *             color: { type: string }
 *             plate: { type: string }
 *             type: { type: string, enum: [sedan, suv, van, wagon, hatchback, pickup, other] }
 *             vin: { type: string }
 *             registrationExpiry: { type: string, format: date-time, nullable: true }
 *             insurancePolicyNumber: { type: string }
 *             insuranceExpiry: { type: string, format: date-time, nullable: true }
 *         capacity:
 *           type: object
 *           properties:
 *             seatsTotal: { type: integer }
 *             maxPassengers: { type: integer }
 *             luggageCapacity: { type: integer }
 *         features:
 *           type: object
 *           properties:
 *             petFriendly: { type: boolean }
 *             babySeat: { type: boolean }
 *             boosterSeat: { type: boolean }
 *             wheelchairAccessible: { type: boolean }
 *             smokingAllowed: { type: boolean }
 *         equipment:
 *           type: object
 *           properties:
 *             chargerTypes:
 *               type: array
 *               items: { type: string, enum: [usb-a, usb-c, magsafe, lighter] }
 *             skiRack: { type: boolean }
 *             bikeRack: { type: boolean }
 *             trunkLarge: { type: boolean }
 *             climateControlZones: { type: integer }
 *         preferences:
 *           type: object
 *           properties:
 *             airportPermit: { type: boolean }
 *             nightShifts: { type: boolean }
 *             longDistance: { type: boolean }
 *             corporateOnly: { type: boolean }
 *         languages:
 *           type: object
 *           properties:
 *             primary: { type: string }
 *             list: { type: array, items: { type: string } }
 *         service:
 *           type: object
 *           properties:
 *             homeCity: { type: string }
 *             homeCoordinates: { $ref: '#/components/schemas/GeoPoint' }
 *             serviceRadiusKm: { type: number }
 *             serviceAreas: { type: array, items: { type: string } }
 *         availability:
 *           type: object
 *           properties:
 *             workingDays: { type: array, items: { type: string, enum: [mon, tue, wed, thu, fri, sat, sun] } }
 *             shiftStart: { type: string, nullable: true, example: "08:00" }
 *             shiftEnd: { type: string, nullable: true, example: "18:00" }
 *             breaks:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   start: { type: string }
 *                   end: { type: string }
 *         pricing:
 *           type: object
 *           properties:
 *             baseFareCents: { type: integer }
 *             perKmCents: { type: integer }
 *             perMinuteCents: { type: integer }
 *             surgeEligible: { type: boolean }
 *         compliance:
 *           type: object
 *           properties:
 *             licenseNumber: { type: string }
 *             licenseExpiry: { type: string, format: date-time, nullable: true }
 *             backgroundCheckCleared: { type: boolean }
 *             backgroundCheckedAt: { type: string, format: date-time, nullable: true }
 *         documents:
 *           type: array
 *           items: { $ref: '#/components/schemas/DriverDocument' }
 *         stats:
 *           type: object
 *           properties:
 *             ratingAvg: { type: number }
 *             ratingCount: { type: integer }
 *             completedRides: { type: integer }
 *             cancellations: { type: integer }
 *             lastActiveAt: { type: string, format: date-time, nullable: true }
 *         notes: { type: string }
 *         tags: { type: array, items: { type: string } }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 */

/**
 * @openapi
 * /driver-details:
 *   get:
 *     summary: List driver details (filterable)
 *     tags: [DriverDetails]
 *     parameters:
 *       - in: query
 *         name: vehicleType
 *         schema: { type: string, enum: [sedan, suv, van, wagon, hatchback, pickup, other] }
 *       - in: query
 *         name: seatsMin
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: petFriendly
 *         schema: { type: boolean }
 *       - in: query
 *         name: babySeat
 *         schema: { type: boolean }
 *       - in: query
 *         name: wheelchairAccessible
 *         schema: { type: boolean }
 *       - in: query
 *         name: language
 *         schema: { type: string, description: ISO 639-1 code }
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: day
 *         schema: { type: string, enum: [mon, tue, wed, thu, fri, sat, sun] }
 *       - in: query
 *         name: q
 *         schema: { type: string, description: fuzzy search on tags/notes/vehicle.make|model|plate }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [recent, rating, seats] }
 *     responses:
 *       200:
 *         description: Paginated driver details
 */
router.get("/", async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));

    const filter: any = {};
    if (req.query.vehicleType) filter["vehicle.type"] = req.query.vehicleType;
    if (req.query.seatsMin) filter["capacity.seatsTotal"] = { $gte: Number(req.query.seatsMin) };
    if (req.query.petFriendly !== undefined)
        filter["features.petFriendly"] = req.query.petFriendly === "true";
    if (req.query.babySeat !== undefined)
        filter["features.babySeat"] = req.query.babySeat === "true";
    if (req.query.wheelchairAccessible !== undefined)
        filter["features.wheelchairAccessible"] = req.query.wheelchairAccessible === "true";
    if (req.query.language) {
        const lang = String(req.query.language);
        filter.$or = [
            { "languages.primary": lang },
            { "languages.list": lang },
            ...(filter.$or || []),
        ];
    }
    if (req.query.city)
        filter["service.homeCity"] = { $regex: String(req.query.city), $options: "i" };
    if (req.query.day) filter["availability.workingDays"] = req.query.day;

    if (req.query.q) {
        const q = String(req.query.q).trim();
        const like = { $regex: q, $options: "i" };
        filter.$or = [
            { tags: like },
            { notes: like },
            { "vehicle.make": like },
            { "vehicle.model": like },
            { "vehicle.plate": like },
            ...(filter.$or || []),
        ];
    }

    let sort: any = { createdAt: -1 };
    if (req.query.sort === "rating") sort = { "stats.ratingAvg": -1, "stats.ratingCount": -1 };
    if (req.query.sort === "seats") sort = { "capacity.seatsTotal": -1 };

    const total = await DriverDetails.countDocuments(filter);
    const items = await DriverDetails.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
});

/**
 * @openapi
 * /driver-details/eligible:
 *   post:
 *     summary: Find eligible drivers for a ride (filters only, no location used)
 *     description: >
 *       Returns a list of drivers whose profile and vehicle match the provided constraints.
 *       This endpoint **does not** apply any geospatial filter yet.
 *     tags: [DriverDetails]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               passengers:
 *                 type: integer
 *                 minimum: 1
 *                 description: Minimum number of passengers the driver must support.
 *               luggages:
 *                 type: integer
 *                 minimum: 0
 *                 description: Minimum luggage in liters.
 *               vehicleType:
 *                 type: string
 *                 enum: [sedan, suv, van, wagon, hatchback, pickup, other]
 *               language:
 *                 type: string
 *                 description: ISO 639-1 code (e.g., "en").
 *               needs:
 *                 type: object
 *                 properties:
 *                   pet:
 *                     type: boolean
 *                   babySeat:
 *                     type: boolean
 *                   wheelchair:
 *                     type: boolean
 *               airportTrip:
 *                 type: boolean
 *                 description: If true, requires drivers with airportPermit preference.
 *               longDistance:
 *                 type: boolean
 *                 description: If true, requires drivers with longDistance preference.
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 30
 *     responses:
 *       200:
 *         description: Eligible drivers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   userId:        { type: string }
 *                   user:
 *                     type: object
 *                     properties:
 *                       _id:   { type: string }
 *                       name:  { type: string }
 *                       email: { type: string }
 *                       phone: { type: string }
 *                       roles:
 *                         type: array
 *                         items: { type: string }
 *                   vehicle:
 *                     type: object
 *                     properties:
 *                       make:  { type: string }
 *                       model: { type: string }
 *                       year:  { type: integer }
 *                       color: { type: string }
 *                       plate: { type: string }
 *                       type:
 *                         type: string
 *                         enum: [sedan, suv, van, wagon, hatchback, pickup, other]
 *                   capacity:
 *                     type: object
 *                     properties:
 *                       seatsTotal:     { type: integer }
 *                       maxPassengers:  { type: integer }
 *                       luggageCapacity: { type: integer }
 *                   features:
 *                     type: object
 *                     properties:
 *                       petFriendly:
 *                          type: boolean
 *                       babySeat:
 *                          type: boolean
 *                       wheelchairAccessible:
 *                          type: boolean
 *                   languages:
 *                     type: object
 *                     properties:
 *                       primary: { type: string }
 *                       list:
 *                         type: array
 *                         items: { type: string }
 *                   preferences:
 *                     type: object
 *                     properties:
 *                       airportPermit: { type: boolean }
 *                       longDistance:  { type: boolean }
 *                   stats:
 *                     type: object
 *                     properties:
 *                       ratingAvg:       { type: number }
 *                       ratingCount:     { type: integer }
 *                       completedRides:  { type: integer }
 *       400:
 *         description: Invalid payload
 */
router.post("/eligible", async (req: Request, res: Response) => {
    try {
        const {
            passengers,
            luggages,
            vehicleType,
            language,
            needs,
            airportTrip,
            longDistance,
            limit,
        } = req.body || {};

        const resultLimit = Math.max(1, Math.min(Number(limit) || 30, 100));

        // Build a Mongo filter object from provided constraints
        const filter: Record<string, any> = {};

        if (Number.isFinite(passengers)) {
            filter["capacity.maxPassengers"] = { $gte: Number(passengers) };
        }
        if (Number.isFinite(luggages)) {
            filter["capacity.luggageCapacity"] = { $gte: Number(luggages) };
        }
        if (vehicleType) {
            filter["vehicle.type"] = vehicleType;
        }
        if (airportTrip === true) {
            filter["preferences.airportPermit"] = true;
        }
        if (longDistance === true) {
            filter["preferences.longDistance"] = true;
        }

        // Needs booleans
        if (needs?.pet === true) {
            filter["features.petFriendly"] = true;
        }
        if (needs?.babySeat === true) {
            filter["features.babySeat"] = true;
        }
        if (needs?.wheelchair === true) {
            filter["features.wheelchairAccessible"] = true;
        }

        // Language can match primary OR in list
        if (language && typeof language === "string") {
            filter["$or"] = [{ "languages.primary": language }, { "languages.list": language }];
        }

        // Query DriverDetails, join basic user info
        const docs = await DriverDetails.find(filter)
            .select({
                userId: 1,
                vehicle: 1,
                capacity: 1,
                features: 1,
                languages: 1,
                preferences: 1,
                stats: 1,
            })
            .sort({ "stats.ratingAvg": -1, "stats.ratingCount": -1 }) // best first
            .limit(resultLimit)
            .lean();

        // fetch user basic fields in one shot (avoid N+1)
        const userIds = docs.map((d) => d.userId).filter(Boolean);
        const users = await User.find({ _id: { $in: userIds } })
            .select({ name: 1, email: 1, phone: 1, roles: 1 })
            .lean();

        const userById = new Map(users.map((u) => [String(u._id), u]));

        const payload = docs.map((d) => {
            const u = userById.get(String(d.userId));
            return {
                userId: String(d.userId),
                user: u
                    ? {
                          _id: String(u._id),
                          name: u.name,
                          email: u.email,
                          phone: u.phone,
                          roles: u.roles,
                      }
                    : undefined,
                vehicle: d.vehicle,
                capacity: d.capacity,
                features: d.features,
                languages: d.languages,
                preferences: d.preferences,
                stats: d.stats,
            };
        });

        res.json(payload);
    } catch (err: any) {
        res.status(400).json({ error: err?.message || "Invalid payload" });
    }
});

/**
 * @openapi
 * /driver-details/near:
 *   get:
 *     summary: Find drivers near a point
 *     tags: [DriverDetails]
 *     parameters:
 *       - in: query
 *         name: lon
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: lat
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: radiusKm
 *         schema: { type: number, default: 10 }
 *       - in: query
 *         name: vehicleType
 *         schema: { type: string, enum: [sedan, suv, van, wagon, hatchback, pickup, other] }
 *       - in: query
 *         name: seatsMin
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Nearby drivers ordered by distance
 */
router.get("/near", async (req: Request, res: Response) => {
    const lon = Number(req.query.lon);
    const lat = Number(req.query.lat);
    if (!Number.isFinite(lon) || !Number.isFinite(lat))
        return res.status(400).json({ error: "lon/lat required" });

    const radiusKm = Number(req.query.radiusKm || 10);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));

    const filter: any = {};
    if (req.query.vehicleType) filter["vehicle.type"] = req.query.vehicleType;
    if (req.query.seatsMin) filter["capacity.seatsTotal"] = { $gte: Number(req.query.seatsMin) };

    const items = await DriverDetails.find({
        ...filter,
        "service.homeCoordinates": {
            $near: {
                $geometry: { type: "Point", coordinates: [lon, lat] },
                $maxDistance: radiusKm * 1000,
            },
        },
    })
        .limit(limit)
        .lean();

    res.json({ items });
});

/**
 * @openapi
 * /driver-details/by-user/{userId}:
 *   get:
 *     summary: Get driver details by userId
 *     tags: [DriverDetails]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 */
router.get("/by-user/:userId([0-9a-fA-F]{24})", async (req: Request, res: Response) => {
    const doc = await DriverDetails.findOne({ userId: req.params.userId }).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
});

/**
 * @openapi
 * /driver-details:
 *   post:
 *     summary: Create driver details (one per user)
 *     tags: [DriverDetails]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/DriverDetails'
 *             required: [userId]
 *     responses:
 *       201: { description: Created }
 *       409: { description: Already exists for user }
 */
router.post("/", async (req: Request, res: Response) => {
    try {
        const { userId } = req.body || {};
        if (!userId || !mongoose.isValidObjectId(userId))
            return res.status(400).json({ error: "userId required" });

        const exists = await DriverDetails.findOne({ userId }).lean();
        if (exists)
            return res.status(409).json({ error: "DriverDetails already exists for this user" });

        const created = await DriverDetails.create(req.body);
        res.status(201).json(created);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /driver-details/{id}:
 *   get:
 *     summary: Get driver details by id
 *     tags: [DriverDetails]
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
    const doc = await DriverDetails.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
});

/**
 * @openapi
 * /driver-details/{id}:
 *   put:
 *     summary: Replace driver details
 *     tags: [DriverDetails]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DriverDetails' }
 *     responses:
 *       200: { description: Replaced }
 *       404: { description: Not found }
 */
router.put("/:id([0-9a-fA-F]{24})", async (req: Request, res: Response) => {
    const doc = await DriverDetails.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
        overwrite: true,
    }).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
});

/**
 * @openapi
 * /driver-details/{id}:
 *   patch:
 *     summary: Update driver details (partial)
 *     tags: [DriverDetails]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, additionalProperties: true }
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 */
router.patch("/:id([0-9a-fA-F]{24})", async (req: Request, res: Response) => {
    const doc = await DriverDetails.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true }
    ).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
});

/**
 * @openapi
 * /driver-details/by-user/{userId}:
 *   patch:
 *     summary: Update driver details by userId (partial)
 *     tags: [DriverDetails]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, additionalProperties: true }
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 */
router.patch("/by-user/:userId([0-9a-fA-F]{24})", async (req: Request, res: Response) => {
    try {
        const doc = await DriverDetails.findOneAndUpdate(
            { userId: req.params.userId },
            { $set: req.body },
            { new: true, runValidators: true }
        ).lean();

        if (!doc) return res.status(404).json({ error: "Not found" });
        res.json(doc);
    } catch (err: any) {
        const norm = normalizeValidationError(err);
        if (norm) return res.status(norm.status).json(norm.body);
        res.status(500).json({ error: "ServerError" });
    }
});

/**
 * @openapi
 * /driver-details/{id}:
 *   delete:
 *     summary: Delete driver details
 *     tags: [DriverDetails]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deleted }
 *       404: { description: Not found }
 */
router.delete("/:id([0-9a-fA-F]{24})", async (req: Request, res: Response) => {
    const r = await DriverDetails.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
});

/**
 * @openapi
 * /driver-details/{id}/documents:
 *   post:
 *     summary: Append a document
 *     tags: [DriverDetails]
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
 *             required: [type, url]
 *             properties:
 *               type: { type: string, enum: [license, insurance, registration, permit, other] }
 *               url: { type: string }
 *               expiresAt: { type: string, format: date-time }
 *               note: { type: string }
 *     responses:
 *       200: { description: Added }
 *       404: { description: Not found }
 */
router.post("/:id([0-9a-fA-F]{24})/documents", async (req: Request, res: Response) => {
    const doc = await DriverDetails.findByIdAndUpdate(
        req.params.id,
        { $push: { documents: { ...req.body, uploadedAt: new Date() } } },
        { new: true, runValidators: true }
    ).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
});

/**
 * @openapi
 * /driver-details/{id}/documents/{docId}:
 *   delete:
 *     summary: Remove a document by subdocument id
 *     tags: [DriverDetails]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: docId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Removed }
 *       404: { description: Not found }
 */
router.delete(
    "/:id([0-9a-fA-F]{24})/documents/:docId([0-9a-fA-F]{24})",
    async (req: Request, res: Response) => {
        const doc = await DriverDetails.findByIdAndUpdate(
            req.params.id,
            { $pull: { documents: { _id: req.params.docId } } },
            { new: true }
        ).lean();
        if (!doc) return res.status(404).json({ error: "Not found" });
        res.json(doc);
    }
);

/**
 * @openapi
 * /driver-details/aggregate/stats:
 *   get:
 *     summary: Basic stats over drivers
 *     tags: [DriverDetails]
 *     responses:
 *       200:
 *         description: Aggregated counts
 */
router.get("/aggregate/stats", async (_req: Request, res: Response) => {
    const [agg] = await DriverDetails.aggregate([
        {
            $facet: {
                total: [{ $count: "n" }],
                byVehicle: [
                    { $group: { _id: "$vehicle.type", n: { $sum: 1 } } },
                    { $sort: { n: -1 } },
                ],
                wheelchair: [
                    { $match: { "features.wheelchairAccessible": true } },
                    { $count: "n" },
                ],
                petFriendly: [{ $match: { "features.petFriendly": true } }, { $count: "n" }],
                avgRating: [
                    { $match: { "stats.ratingCount": { $gt: 0 } } },
                    { $group: { _id: null, avg: { $avg: "$stats.ratingAvg" }, n: { $sum: 1 } } },
                ],
            },
        },
    ]);

    res.json({
        total: agg?.total?.[0]?.n ?? 0,
        byVehicle: agg?.byVehicle ?? [],
        wheelchair: agg?.wheelchair?.[0]?.n ?? 0,
        petFriendly: agg?.petFriendly?.[0]?.n ?? 0,
        avgRating: agg?.avgRating?.[0]?.avg ?? null,
        ratedDrivers: agg?.avgRating?.[0]?.n ?? 0,
    });
});

export default router;
