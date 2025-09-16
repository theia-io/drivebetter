import { Router, Request, Response } from "express";
import passport from "passport";
import { initPassport } from "../lib/oauth/passport";

const router = Router();
initPassport();

/**
 * @openapi
 * /oauth/google:
 *   get:
 *     summary: Google OAuth login
 *     tags: [OAuth]
 */
router.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

/**
 * @openapi
 * /oauth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     tags: [OAuth]
 *     responses:
 *       200:
 *         description: JWT tokens issued
 */
router.get(
    "/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: "/login" }),
    (req: Request, res: Response) => {
        const user = req.user as any;
        if (!user) return res.status(401).json({ error: "OAuth failed" });

        // Return JWTs to client (could also set cookies here)
        return res.json({ user: { id: user.id, email: user.email, roles: user.roles }, tokens: user.tokens });
    }
);

export default router;
