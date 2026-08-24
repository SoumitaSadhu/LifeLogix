import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import redis from "../../lib/redis";
import { generateOtp, hashOtp, compareOtp } from "../../utils/otp";
import { sendSmsOtp } from "../../utils/sms";

const OTP_TTL_SECONDS = 5 * 60;         // 5 min OTP validity
const COOLDOWN_SECONDS = 60;            // gap between resend requests
const MAX_REQUESTS_PER_HOUR = 5;
const HOURLY_WINDOW_SECONDS = 60 * 60;
const MAX_VERIFY_ATTEMPTS = 5;

interface OtpData {
  hash: string;
  attempts: number;
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
  await sendSmsOtp(mobile, otp);

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
      data: { mobile, isVerified: true },
    });
    isNewUser = true;
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
  }

  // 5️⃣ Issue JWT (next step)
  // const token = generateJWT({ userId: user.userId });

  return res.status(200).json({
    message: "OTP verified successfully",
    userId: user.userId,
    isNewUser,
    // token,
  });
}