import { type Request, type Response } from "express";
import prisma from "../../lib/prisma.js";
import { getAccessUserId } from "../../utils/authSession.js";

const VALUE_MIN = 1;
const VALUE_MAX = 2000;
const NOTES_MAX_LENGTH = 1000;

async function getAuthenticatedUserId(req: Request): Promise<string | null> {
  const sessionUserId = await getAccessUserId(req);
  if (sessionUserId === null) return null;

  const user = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: { userId: true },
  });
  return user?.userId ?? null;
}

export async function getBloodSugarReadings(req: Request, res: Response) {
  const userId = await getAuthenticatedUserId(req);
  if (userId === null) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const readings = await prisma.bloodSugarReading.findMany({
    where: { userId },
    orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
  });
  return res.status(200).json({ readings });
}

export async function createBloodSugarEntry(req: Request, res: Response) {
  const userId = await getAuthenticatedUserId(req);
  if (userId === null) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json({ message: "A JSON object is required" });
  }

  const { value, recordedAt } = req.body;
  const rawNotes: unknown = req.body.notes;
  const parsedRecordedAt = typeof recordedAt === "string" ? new Date(recordedAt) : undefined;

  if (!Number.isInteger(value) || value < VALUE_MIN || value > VALUE_MAX) {
    return res.status(400).json({ message: `Blood sugar must be an integer between ${VALUE_MIN} and ${VALUE_MAX} mg/dL` });
  }

  if (recordedAt !== undefined && (!parsedRecordedAt || Number.isNaN(parsedRecordedAt.getTime()))) {
    return res.status(400).json({ message: "Recorded date and time must be a valid date" });
  }

  if (rawNotes !== undefined && rawNotes !== null && typeof rawNotes !== "string") {
    return res.status(400).json({ message: "Notes must be text" });
  }
  const notes = typeof rawNotes === "string" ? rawNotes.trim() : "";
  if (notes.length > NOTES_MAX_LENGTH) {
    return res.status(400).json({ message: `Notes must be ${NOTES_MAX_LENGTH} characters or fewer` });
  }

  const reading = await prisma.bloodSugarReading.create({
    data: {
      userId,
      valueMgDl: value,
      ...(parsedRecordedAt ? { recordedAt: parsedRecordedAt } : {}),
      ...(notes ? { notes } : {}),
    },
  });

  return res.status(201).json({ reading });
}