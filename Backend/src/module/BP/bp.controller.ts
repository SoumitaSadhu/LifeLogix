import { type Request, type Response } from "express";
import prisma from "../../lib/prisma.js";
import { getAccessUserId } from "../../utils/authSession.js";

const SYSTOLIC_MIN = 20;
const SYSTOLIC_MAX = 300;
const DIASTOLIC_MIN = 20;
const DIASTOLIC_MAX = 200;
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

export async function getBloodPressureReadings(req: Request, res: Response) {
  const userId = await getAuthenticatedUserId(req);
  if (userId === null) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const readings = await prisma.bloodPressureReading.findMany({
    where: { userId },
    orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
  });
  return res.status(200).json({ readings });
}

export async function createBloodPressureEntry(req: Request, res: Response) {
  const userId = await getAuthenticatedUserId(req);
  if (userId === null) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json({ message: "A JSON object is required" });
  }

  const { systolic, diastolic, recordedAt } = req.body;
  const rawNotes: unknown = req.body.notes;
  const parsedRecordedAt = typeof recordedAt === "string" ? new Date(recordedAt) : undefined;

  if (
    !Number.isInteger(systolic) ||
    systolic < SYSTOLIC_MIN ||
    systolic > SYSTOLIC_MAX ||
    !Number.isInteger(diastolic) ||
    diastolic < DIASTOLIC_MIN ||
    diastolic > DIASTOLIC_MAX ||
    systolic <= diastolic
  ) {
    return res.status(400).json({ message: "Enter valid systolic and diastolic values" });
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

  const reading = await prisma.bloodPressureReading.create({
    data: {
      userId,
      systolic,
      diastolic,
      ...(parsedRecordedAt ? { recordedAt: parsedRecordedAt } : {}),
      ...(notes ? { notes } : {}),
    },
  });

  return res.status(201).json({ reading });
}