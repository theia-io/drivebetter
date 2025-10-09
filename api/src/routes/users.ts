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
 *                   name:  { type: string }
 *                   email: { type: string }
 *                   phone: { type: string }
 *                   roles:
 *                     type: array
 *                     items: { type: string }
 */
router.get("/drivers", async (_req: Request, res: Response) => {
    const drivers = await User.find({ roles: "driver" })
        .select({ name: 1, email: 1, phone: 1, roles: 1, _id: 0 })
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

export default router;
