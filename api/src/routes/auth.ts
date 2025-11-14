import { Request, Response, Router } from "express";
import jwt from "jsonwebtoken";
import { requireAuth } from "../lib/auth";
import {
    addMinutes,
    genOtp,
    genToken,
    hashPassword,
    verifyPassword,
} from "../lib/crypto";
import {
    sendOtpEmail,
    sendPasswordResetEmail,
    sendVerificationEmail,
} from "../lib/email";
import {
    signAccessToken,
    signRefreshToken,
    verifyToken,
} from "../lib/oauth/tokens";
import User from "../models/user.model";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const REQUIRE_EMAIL_VERIFICATION =
  String(process.env.REQUIRE_EMAIL_VERIFICATION ?? "true") === "true";

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register with email + password
 *     tags: [Auth]
 *     security: []  # public
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *     responses:
 *       201: { description: Registered, verification email sent }
 *       409: { description: Email already in use }
 */
router.post("/register", async (req: Request, res: Response) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password)
    return res.status(400).json({ error: "name, email, password required" });

  const lower = String(email).toLowerCase();
  const existing = await User.findOne({ email: lower });
  if (existing) return res.status(409).json({ error: "Email already in use" });

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    name,
    email: lower,
    passwordHash,
    roles: ["client"], // default role; adjust if needed
  });

  // create email verification token
  const token = genToken(48);
  user.emailVerifyToken = token;
  user.emailVerifyExpires = addMinutes(new Date(), 60);
  await user.save();

  await sendVerificationEmail(user.email, token);
  return res
    .status(201)
    .json({ message: "Registered. Please verify your email." });
});

/**
 * @openapi
 * /auth/verify-email:
 *   post:
 *     summary: Verify email (token)
 *     tags: [Auth]
 *     security: []  # public
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string }
 *     responses:
 *       200: { description: Email verified }
 *       400: { description: Invalid or expired token }
 */
router.post("/verify-email", async (req: Request, res: Response) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: "token required" });

  const user = await User.findOne({
    emailVerifyToken: token,
    emailVerifyExpires: { $gt: new Date() },
  });
  if (!user) return res.status(400).json({ error: "Invalid or expired token" });

  user.emailVerified = true;
  user.emailVerifyToken = null;
  user.emailVerifyExpires = null;
  await user.save();

  return res.json({ message: "Email verified" });
});

/**
 * @openapi
 * /auth/resend-verification:
 *   post:
 *     summary: Resend verification email
 *     tags: [Auth]
 *     security: []  # public
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: Sent if account exists and is unverified }
 */
router.post("/resend-verification", async (req: Request, res: Response) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "email required" });

  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user)
    return res.json({
      message: "If the account exists, an email has been sent.",
    });
  if (user.emailVerified) return res.json({ message: "Already verified" });

  const token = genToken(48);
  user.emailVerifyToken = token;
  user.emailVerifyExpires = addMinutes(new Date(), 60);
  await user.save();

  await sendVerificationEmail(user.email, token);
  return res.json({ message: "Verification link sent" });
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login with email + password
 *     tags: [Auth]
 *     security: []  # public
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200: { description: Tokens + user returned }
 *       401: { description: Invalid credentials }
 *       403: { description: Email not verified }
 */
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: "email, password required" });
  const user = await User.findOne({ email: String(email).toLowerCase() });

  if (!user || !user.passwordHash)
    return res.status(401).json({ error: "Invalid credentials" });

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  // if (REQUIRE_EMAIL_VERIFICATION && !user.emailVerified) {
  //     return res.status(403).json({ error: "Email not verified" });
  // }

  const accessToken = signAccessToken({
    id: user.id,
    email: user.email,
    roles: user.roles,
  });
  const refreshToken = signRefreshToken({
    id: user.id,
    email: user.email,
    roles: user.roles,
  });

  // optional allow-list of refresh tokens
  user.refreshTokens = [...(user.refreshTokens || []), refreshToken];
  await user.save();

  return res.json({
    user: {
      id: user.id,
      email: user.email,
      roles: user.roles,
      emailVerified: user.emailVerified,
    },
    accessToken,
    refreshToken,
  });
});

/**
 * @openapi
 * /auth/request-otp:
 *   post:
 *     summary: Request an OTP code via email MVP logs to console
 *     tags: [Auth]
 *     security: []  # public
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 */
router.post("/request-otp", async (req: Request, res: Response) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "email required" });

  const lower = String(email).toLowerCase();
  let user = await User.findOne({ email: lower });
  if (!user) {
    user = await User.create({
      name: lower.split("@")[0],
      email: lower,
      roles: ["client"],
    });
  }

  const code = genOtp();
  user.otpCode = code;
  user.otpExpires = addMinutes(new Date(), 10);
  await user.save();

  await sendOtpEmail(user.email, code);
  return res.json({ message: "OTP sent" });
});

/**
 * @openapi
 * /auth/verify-otp:
 *   post:
 *     summary: Verify OTP and log in
 *     tags: [Auth]
 *     security: []  # public
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email: { type: string, format: email }
 *               code: { type: string }
 */
router.post("/verify-otp", async (req: Request, res: Response) => {
  const { email, code } = req.body || {};
  if (!email || !code)
    return res.status(400).json({ error: "email, code required" });

  const user = await User.findOne({
    email: String(email).toLowerCase(),
    otpCode: code,
    otpExpires: { $gt: new Date() },
  });
  if (!user) return res.status(400).json({ error: "Invalid or expired code" });

  // clear OTP & optionally consider this email-verified
  user.otpCode = null;
  user.otpExpires = null;
  if (!user.emailVerified) user.emailVerified = true;
  await user.save();

  const accessToken = signAccessToken({
    id: user.id,
    email: user.email,
    roles: user.roles,
  });
  const refreshToken = signRefreshToken({
    id: user.id,
    email: user.email,
    roles: user.roles,
  });

  user.refreshTokens = [...(user.refreshTokens || []), refreshToken];
  await user.save();

  return res.json({
    user: {
      id: user.id,
      email: user.email,
      roles: user.roles,
      emailVerified: user.emailVerified,
    },
    accessToken,
    refreshToken,
  });
});

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token (allow-list checked)
 *     tags: [Auth]
 *     security: []  # public (uses body token, not header)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 */
router.post("/refresh", async (req: Request, res: Response) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken)
    return res.status(400).json({ error: "refreshToken required" });

  try {
    const payload = verifyToken(refreshToken);
    if (payload.typ !== "refresh") throw new Error("Invalid token type");

    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: "Invalid token (user)" });

    if (user.refreshTokens && !user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({ error: "Refresh token not recognized" });
    }

    const newAccessToken = jwt.sign(
      { sub: user.id, email: user.email, roles: user.roles, typ: "access" },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    return res.json({ accessToken: newAccessToken });
  } catch {
    return res.status(401).json({ error: "Invalid refresh token" });
  }
});

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Logout (removes refresh token from allow-list)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.post("/logout", async (req: Request, res: Response) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken)
    return res.status(400).json({ error: "refreshToken required" });

  try {
    const payload = verifyToken(refreshToken);
    const user = await User.findById(payload.sub);
    if (user?.refreshTokens) {
      user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
      await user.save();
    }
  } catch {
    // ignore invalid token on logout
  }
  return res.json({ ok: true });
});

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     summary: Start password reset (email with token)
 *     tags: [Auth]
 *     security: []  # public
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 */
router.post("/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "email required" });

  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user)
    return res.json({
      message: "If the account exists, an email has been sent.",
    });

  user.resetToken = genToken(48);
  user.resetExpires = addMinutes(new Date(), 30);
  await user.save();

  await sendPasswordResetEmail(user.email, user.resetToken);
  return res.json({
    message: "If the account exists, an email has been sent.",
  });
});

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     summary: Complete password reset
 *     tags: [Auth]
 *     security: []  # public
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string }
 *               password: { type: string, minLength: 6 }
 */
router.post("/reset-password", async (req: Request, res: Response) => {
  const { token, password } = req.body || {};
  if (!token || !password)
    return res.status(400).json({ error: "token, password required" });

  const user = await User.findOne({
    resetToken: token,
    resetExpires: { $gt: new Date() },
  });
  if (!user) return res.status(400).json({ error: "Invalid or expired token" });

  user.passwordHash = await hashPassword(password);
  user.resetToken = null;
  user.resetExpires = null;
  await user.save();

  return res.json({ message: "Password updated" });
});

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get current user (requires Bearer token)
 *     tags: [Auth]
 *     responses:
 *       200: { description: Current user info }
 *       401: { description: Unauthorized }
 */
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  const authUser = (req as any).user as { id: string };
  const user = await User.findById(authUser.id).select(
    "email roles emailVerified name"
  );
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

export default router;
