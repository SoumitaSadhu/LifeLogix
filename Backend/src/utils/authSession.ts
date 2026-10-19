import { createHash, randomBytes } from "node:crypto";
import { type Request, type Response } from "express";
import redis from "../lib/redis.js";

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;
const ACCESS_COOKIE = "lifelogix_access";
const REFRESH_COOKIE = "lifelogix_refresh";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function readCookie(req: Request, name: string): string | null {
  const entry = req.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  return entry ? entry.slice(name.length + 1) : null;
}

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds * 1000,
  };
}

export async function issueAuthSession(userId: number, res: Response): Promise<void> {
  const accessToken = randomBytes(32).toString("base64url");
  const refreshToken = randomBytes(32).toString("base64url");

  await Promise.all([
    redis.set(`auth:access:${hashToken(accessToken)}`, String(userId), "EX", ACCESS_TTL_SECONDS),
    redis.set(`auth:refresh:${hashToken(refreshToken)}`, String(userId), "EX", REFRESH_TTL_SECONDS),
  ]);

  res.cookie(ACCESS_COOKIE, accessToken, cookieOptions(ACCESS_TTL_SECONDS));
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(REFRESH_TTL_SECONDS));
}

export async function getAccessUserId(req: Request): Promise<number | null> {
  const token = readCookie(req, ACCESS_COOKIE);
  if (!token) return null;

  const userId = await redis.get(`auth:access:${hashToken(token)}`);
  if (!userId || !/^\d+$/.test(userId)) return null;

  return Number(userId);
}

export async function rotateAuthSession(req: Request, res: Response): Promise<number | null> {
  const refreshToken = readCookie(req, REFRESH_COOKIE);
  if (!refreshToken) return null;

  const userId = await redis.getdel(`auth:refresh:${hashToken(refreshToken)}`);
  const oldAccessToken = readCookie(req, ACCESS_COOKIE);
  if (oldAccessToken) {
    await redis.del(`auth:access:${hashToken(oldAccessToken)}`);
  }

  if (!userId || !/^\d+$/.test(userId)) {
    clearAuthCookies(res);
    return null;
  }

  const parsedUserId = Number(userId);
  await issueAuthSession(parsedUserId, res);
  return parsedUserId;
}

export async function revokeAuthSession(req: Request, res: Response): Promise<void> {
  const accessToken = readCookie(req, ACCESS_COOKIE);
  const refreshToken = readCookie(req, REFRESH_COOKIE);

  const keys = [
    accessToken ? `auth:access:${hashToken(accessToken)}` : null,
    refreshToken ? `auth:refresh:${hashToken(refreshToken)}` : null,
  ].filter((key): key is string => key !== null);

  if (keys.length > 0) await redis.del(...keys);
  clearAuthCookies(res);
}

export function clearAuthCookies(res: Response): void {
  const options = cookieOptions(0);
  res.clearCookie(ACCESS_COOKIE, options);
  res.clearCookie(REFRESH_COOKIE, options);
}