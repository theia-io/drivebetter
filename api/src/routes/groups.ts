import { Router, Request, Response } from "express";
import Group from "../models/group.model";

const router = Router();

/**
 * @openapi
 * /groups:
 *   get:
 *     summary: List groups
 *     tags: [Groups]
 *     responses:
 *       200: { description: OK }
 */
router.get("/", async (_req: Request, res: Response) => {
    const items = await Group.find().sort({ name: 1 });
    res.json({ items });
});

/**
 * @openapi
 * /groups:
 *   post:
 *     summary: Create group
 *     tags: [Groups]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type]
 *             properties:
 *               name: { type: string }
 *               type: { type: string, enum: [local, corporate, global] }
 *               city: { type: string }
 *     responses:
 *       201: { description: Created }
 */
router.post("/", async (req: Request, res: Response) => {
    try {
        const doc = await Group.create(req.body);
        res.status(201).json(doc);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /groups/{id}/members:
 *   post:
 *     summary: Add or remove members
 *     tags: [Groups]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               add: { type: array, items: { type: string } }
 *               remove: { type: array, items: { type: string } }
 *     responses:
 *       200: { description: Updated }
 */
router.post("/:id/members", async (req: Request, res: Response) => {
    const { add = [], remove = [] } = req.body as { add?: string[]; remove?: string[] };
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });

    const current = new Set(group.members.map(String));
    add.forEach((u) => current.add(u));
    remove.forEach((u) => current.delete(u));

    group.members = Array.from(current) as any;
    await group.save();
    res.json({ ok: true, group });
});

/**
 * @openapi
 * /groups/{id}:
 *   get:
 *     summary: Get group by ID
 *     tags: [Groups]
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
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });
    res.json(group);
});

export default router;
