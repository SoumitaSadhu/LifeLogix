import { randomUUID } from "node:crypto";
import { type Request, type Response } from "express";
import prisma from "../../lib/prisma.js";
import redis from "../../lib/redis.js";
import { generateOtp, hashOtp, compareOtp } from "../../utils/otp.js";
import { sendSmsOtp } from "../../utils/sms.js";
import { getAccessUserId, issueAuthSession, revokeAuthSession, rotateAuthSession } from "../../utils/authSession.js";

const OTP_TTL_SECONDS = 5 * 60;         // 5 min OTP validity
const COOLDOWN_SECONDS = 60;            // gap between resend requests
const MAX_REQUESTS_PER_HOUR = 5;
const HOURLY_WINDOW_SECONDS = 60 * 60;
const MAX_VERIFY_ATTEMPTS = 5;

interface OtpData {
  hash: string;
  attempts: number;
}

async function ensureUserDetails(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const stableUserId = user.userId ?? randomUUID();
  const updatedUser = user.userId
    ? user
    : await prisma.user.update({
        where: { id: user.id },
        data: { userId: stableUserId },
      });

  await prisma.userDetails.upsert({
    where: { userId: stableUserId },
    create: { userId: stableUserId },
    update: {},
  });

  return prisma.user.findUnique({
    where: { id: updatedUser.id },
    include: { details: true },
  });
}

// ─── SEND OTP ────────────────────────────────────────────────
export async function sendOtp(req: Request, res: Response) {
  const { mobile } = req.body;

  if (!mobile) {
    return res.status(400).json({ message: "Mobile number is required" });
  }

  // 1️⃣ Cooldown check
  const cooldownKey = `otp_cooldown:${mobile}`;
  const isCoolingDown = await redis.get(cooldownKey);

  if (isCoolingDown) {
    const ttl = await redis.ttl(cooldownKey);
    return res.status(429).json({
      message: `Please wait ${ttl}s before requesting another OTP`,
    });
  }

  // 2️⃣ Hourly request cap
  const hourlyKey = `otp_hourly:${mobile}`;
  const requestCount = await redis.incr(hourlyKey);

  if (requestCount === 1) {
    // first request in this window → set expiry
    await redis.expire(hourlyKey, HOURLY_WINDOW_SECONDS);
  }

  if (requestCount > MAX_REQUESTS_PER_HOUR) {
    return res.status(429).json({
      message: "Too many OTP requests. Please try again later.",
    });
  }

  // 3️⃣ Generate + hash OTP, store in Redis with TTL
  const otp = generateOtp();
  const otpHash = await hashOtp(otp);

  const otpData: OtpData = { hash: otpHash, attempts: 0 };
  await redis.set(`otp:${mobile}`, JSON.stringify(otpData), "EX", OTP_TTL_SECONDS);

  // 4️⃣ Set cooldown marker
  await redis.set(cooldownKey, "1", "EX", COOLDOWN_SECONDS);

  // 5️⃣ Send SMS
  try {
    await sendSmsOtp(mobile, otp);
  } catch (error) {
    await redis.del(`otp:${mobile}`, cooldownKey);
    console.error("Failed to send OTP SMS:", error instanceof Error ? error.message : error);
    return res.status(502).json({ message: "Could not send OTP. Check SMS provider configuration and try again." });
  }

  return res.status(200).json({ message: "OTP sent successfully" });
}

// ─── VERIFY OTP ──────────────────────────────────────────────
export async function verifyOtp(req: Request, res: Response) {
  const { mobile, otp } = req.body;

  if (!mobile || !otp) {
    return res.status(400).json({ message: "Mobile and OTP are required" });
  }

  const otpKey = `otp:${mobile}`;
  const rawData = await redis.get(otpKey);

  if (!rawData) {
    return res.status(400).json({
      message: "OTP expired or not found. Please request a new one.",
    });
  }

  const otpData: OtpData = JSON.parse(rawData);

  // 1️⃣ Attempt lockout check
  if (otpData.attempts >= MAX_VERIFY_ATTEMPTS) {
    await redis.del(otpKey); // force re-request
    return res.status(429).json({
      message: "Too many incorrect attempts. Please request a new OTP.",
    });
  }

  // 2️⃣ Compare OTP
  const isValid = await compareOtp(otp, otpData.hash);

  if (!isValid) {
    otpData.attempts += 1;
    const ttl = await redis.ttl(otpKey); // preserve remaining expiry
    await redis.set(otpKey, JSON.stringify(otpData), "EX", ttl > 0 ? ttl : 1);

    return res.status(400).json({ message: "Incorrect OTP" });
  }

  // 3️⃣ Valid → delete immediately (single-use, prevents replay)
  await redis.del(otpKey);

  // 4️⃣ Find or create user (signup + login combined)
  let user = await prisma.user.findUnique({ where: { mobile } });
  let isNewUser = false;

  if (!user) {
    user = await prisma.user.create({
      data: { mobile, userId: randomUUID(), isVerified: true },
    });
    isNewUser = true;
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
  }

  const userWithDetails = await ensureUserDetails(user.id);
  if (!userWithDetails?.userId) {
    return res.status(500).json({ message: "Could not initialize user profile" });
  }

  await issueAuthSession(user.id, res);

  return res.status(200).json({
    message: "OTP verified successfully",
    userId: userWithDetails.userId,
    mobile: user.mobile,
    name: userWithDetails.details?.name ?? "",
    email: userWithDetails.email ?? "",
    age: userWithDetails.details?.age ?? null,
    weight: userWithDetails.details?.weightKg ?? null,
    height: userWithDetails.details?.heightCm ?? null,
    conditions: userWithDetails.details?.conditions ?? [],
    targetWeight: userWithDetails.details?.targetWeightKg ?? null,
    targetBP: userWithDetails.details?.targetBP ?? "",
    exerciseGoal: userWithDetails.details?.exerciseGoal ?? "",
    goalNotes: userWithDetails.details?.goalNotes ?? "",
    isNewUser,
  });
}

export async function getCurrentUser(req: Request, res: Response) {
  const userId = await getAccessUserId(req);
  if (userId === null) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const user = await ensureUserDetails(userId);
  if (!user?.userId) {
    await revokeAuthSession(req, res);
    return res.status(401).json({ message: "Authentication required" });
  }

  return res.status(200).json({
    userId: user.userId,
    mobile: user.mobile ?? "",
    name: user.details?.name ?? "",
    email: user.email ?? "",
    age: user.details?.age ?? null,
    weight: user.details?.weightKg ?? null,
    height: user.details?.heightCm ?? null,
    conditions: user.details?.conditions ?? [],
    targetWeight: user.details?.targetWeightKg ?? null,
    targetBP: user.details?.targetBP ?? "",
    exerciseGoal: user.details?.exerciseGoal ?? "",
    goalNotes: user.details?.goalNotes ?? "",
    isNewUser: false,
  });
}

export async function updateProfile(req: Request, res: Response) {
  const userId = await getAccessUserId(req);
  if (userId === null) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const account = await ensureUserDetails(userId);
  if (!account?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const { age, weight, height, targetWeight } = req.body;
  const targetBP = typeof req.body.targetBP === "string" ? req.body.targetBP.trim() : "";
  const exerciseGoal = typeof req.body.exerciseGoal === "string" ? req.body.exerciseGoal.trim() : "";
  const goalNotes = typeof req.body.goalNotes === "string" ? req.body.goalNotes.trim() : "";
  const conditions = req.body.conditions;

  if (name.length > 150 || email.length > 150) {
    return res.status(400).json({ message: "Name or email is too long" });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Enter a valid email address" });
  }
  if (age !== undefined && age !== null && (!Number.isInteger(age) || age < 1 || age > 120)) {
    return res.status(400).json({ message: "Age must be an integer between 1 and 120" });
  }
  if (weight !== undefined && weight !== null && (typeof weight !== "number" || weight <= 0 || weight > 500)) {
    return res.status(400).json({ message: "Weight must be between 0 and 500 kg" });
  }
  if (height !== undefined && height !== null && (typeof height !== "number" || height <= 0 || height > 300)) {
    return res.status(400).json({ message: "Height must be between 0 and 300 cm" });
  }
  if (targetWeight !== undefined && targetWeight !== null && (typeof targetWeight !== "number" || targetWeight <= 0 || targetWeight > 500)) {
    return res.status(400).json({ message: "Target weight must be between 0 and 500 kg" });
  }
  if (targetBP.length > 20 || exerciseGoal.length > 200 || goalNotes.length > 5000) {
    return res.status(400).json({ message: "A health goal field is too long" });
  }
  if (!Array.isArray(conditions) || conditions.some((condition) => typeof condition !== "string" || condition.length > 100)) {
    return res.status(400).json({ message: "Conditions must be a list of strings" });
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { email: email || null },
    });
    const details = await prisma.userDetails.upsert({
      where: { userId: user.userId! },
      create: {
        userId: user.userId!,
        name: name || null,
        age: age ?? null,
        weightKg: weight ?? null,
        heightCm: height ?? null,
        conditions,
        targetWeightKg: targetWeight ?? null,
        targetBP: targetBP || null,
        exerciseGoal: exerciseGoal || null,
        goalNotes: goalNotes || null,
      },
      update: {
        name: name || null,
        age: age ?? null,
        weightKg: weight ?? null,
        heightCm: height ?? null,
        conditions,
        targetWeightKg: targetWeight ?? null,
        targetBP: targetBP || null,
        exerciseGoal: exerciseGoal || null,
        goalNotes: goalNotes || null,
      },
    });

    return res.status(200).json({
      userId: user.userId,
      mobile: user.mobile ?? "",
      name: details.name ?? "",
      email: user.email ?? "",
      age: details.age,
      weight: details.weightKg,
      height: details.heightCm,
      conditions: details.conditions,
      targetWeight: details.targetWeightKg,
      targetBP: details.targetBP ?? "",
      exerciseGoal: details.exerciseGoal ?? "",
      goalNotes: details.goalNotes ?? "",
      isNewUser: false,
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return res.status(409).json({ message: "That email address is already in use" });
    }
    throw error;
  }
}

export async function refreshSession(req: Request, res: Response) {
  const userId = await rotateAuthSession(req, res);
  if (userId === null) {
    return res.status(401).json({ message: "Session expired. Please sign in again." });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return res.status(401).json({ message: "Session expired. Please sign in again." });
  }

  return res.status(200).json({ message: "Session refreshed" });
}

export async function logout(req: Request, res: Response) {
  await revokeAuthSession(req, res);
  return res.status(200).json({ message: "Logged out" });
}