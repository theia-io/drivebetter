import { Router, Request, Response } from "express";
import User from "../models/user.model";

const router = Router();

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users
 */
router.get("/", async (_req: Request, res: Response) => {
    const users = await User.find().select("-password");
    res.json(users);
});

/**
 * @openapi
 * /users/drivers:
 *   get:
 *     summary: Get all drivers (public fields only)
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of drivers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:  { type: string }
 *                   name:  { type: string }
 *                   email: { type: string }
 *                   phone: { type: string }
 *                   roles:
 *                     type: array
 *                     items: { type: string }
 */
router.get("/drivers", async (_req: Request, res: Response) => {
    const drivers = await User.find({ roles: "driver" })
        .select({ name: 1, email: 1, phone: 1, roles: 1, _id: 1 })
        .lean();
    res.json(drivers);
});

// keep your ObjectId-constrained route after this
router.get("/:id([0-9a-fA-F]{24})", async (req: Request, res: Response) => {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
});

/**
 * @openapi
 * /users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: User created
 */
router.post("/", async (req: Request, res: Response) => {
    try {
        const { name, email, phone, roles } = req.body;
        const user = await User.create({ name, email, phone, roles });
        res.status(201).json(user);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /users:
 *   get:
 *     summary: List users
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [driver, dispatcher, client, admin] }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search by name or email (case-insensitive)
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items: { type: array, items: { $ref: '#/components/schemas/User' } }
 *                 page: { type: integer }
 *                 limit: { type: integer }
 *                 total: { type: integer }
 *                 pages: { type: integer }
 */
router.get("/", async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));

    const filter: any = {};
    if (req.query.role) filter.roles = req.query.role;

    if (req.query.q) {
        const q = String(req.query.q).trim();
        filter.$or = [
            { name:  { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
        ];
    }

    const total = await User.countDocuments(filter);
    const items = await User.find(filter)
        .select("-passwordHash -refreshTokens -otpCode -otpExpires -resetToken -resetExpires -emailVerifyToken -emailVerifyExpires")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
});

/**
 * @openapi
 * /users/drivers:
 *   get:
 *     summary: List drivers (public fields)
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Drivers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:   { type: string }
 *                   name:  { type: string }
 *                   email: { type: string }
 *                   phone: { type: string }
 *                   roles:
 *                     type: array
 *                     items: { type: string }
 */
router.get("/drivers", async (_req: Request, res: Response) => {
    const drivers = await User.find({ roles: "driver" })
        .select({ _id: 1, name: 1, email: 1, phone: 1, roles: 1 })
        .lean();
    res.json(drivers);
});

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404: { description: Not found }
 */
router.get("/:id([0-9a-fA-F]{24})", async (req: Request, res: Response) => {
    const user = await User.findById(req.params.id)
        .select("-passwordHash -refreshTokens -otpCode -otpExpires -resetToken -resetExpires -emailVerifyToken -emailVerifyExpires")
        .lean();
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
});

/**
 * @openapi
 * /users:
 *   post:
 *     summary: Create user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email]
 *             properties:
 *               name:  { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               roles:
 *                 type: array
 *                 items: { type: string, enum: [driver, dispatcher, client, admin] }
 *     responses:
 *       201:
 *         description: Created
 *       409:
 *         description: Email exists
 */
router.post("/", async (req: Request, res: Response) => {
    try {
        const { name, email, phone, roles } = req.body;
        const exists = await User.findOne({ email });
        if (exists) return res.status(409).json({ error: "Email already in use" });
        const user = await User.create({ name, email, phone, roles });
        const plain = user.toObject();
        // strip sensitive
        delete (plain as any).passwordHash;
        delete (plain as any).refreshTokens;
        res.status(201).json(plain);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /users/{id}:
 *   put:
 *     summary: Replace user
 *     tags: [Users]
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
 *             required: [name, email]
 *             properties:
 *               name:  { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               roles:
 *                 type: array
 *                 items: { type: string, enum: [driver, dispatcher, client, admin] }
 *     responses:
 *       200: { description: Replaced }
 *       404: { description: Not found }
 */
router.put("/:id([0-9a-fA-F]{24})", async (req: Request, res: Response) => {
    const { name, email, phone, roles } = req.body;
    const doc = await User.findByIdAndUpdate(
        req.params.id,
        { $set: { name, email, phone, roles } },
        { new: true, runValidators: true, overwrite: true }
    ).select("-passwordHash -refreshTokens").lean();
    if (!doc) return res.status(404).json({ error: "User not found" });
    res.json(doc);
});

/**
 * @openapi
 * /users/{id}:
 *   patch:
 *     summary: Update user (partial)
 *     tags: [Users]
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
 *             properties:
 *               name:  { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               roles:
 *                 type: array
 *                 items: { type: string, enum: [driver, dispatcher, client, admin] }
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 */
router.patch("/:id([0-9a-fA-F]{24})", async (req: Request, res: Response) => {
    const allowed = ["name", "email", "phone", "roles"] as const;
    const $set: any = {};
    for (const k of allowed) if (k in req.body) $set[k] = req.body[k];
    const doc = await User.findByIdAndUpdate(
        req.params.id,
        Object.keys($set).length ? { $set } : {},
        { new: true, runValidators: true }
    ).select("-passwordHash -refreshTokens").lean();
    if (!doc) return res.status(404).json({ error: "User not found" });
    res.json(doc);
});

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Delete user
 *     tags: [Users]
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
    const r = await User.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "User not found" });
    res.json({ ok: true });
});

export default router;

/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         name: { type: string }
 *         email: { type: string }
 *         phone: { type: string }
 *         roles:
 *           type: array
 *           items: { type: string, enum: [driver, dispatcher, client, admin] }
 *         referralCode: { type: string }
 *         emailVerified: { type: boolean }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 */
