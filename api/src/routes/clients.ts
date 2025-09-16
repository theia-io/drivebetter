import { Router, Request, Response } from "express";
import Client from "../models/client.model";

const router = Router();

/**
 * @openapi
 * /clients:
 *   post:
 *     summary: Create client
 *     tags: [Clients]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone]
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Created }
 */
router.post("/", async (req: Request, res: Response) => {
    try {
        const doc = await Client.create(req.body);
        res.status(201).json(doc);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * @openapi
 * /clients/{id}:
 *   get:
 *     summary: Get client by ID
 *     tags: [Clients]
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
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ error: "Client not found" });
    res.json(client);
});

export default router;
