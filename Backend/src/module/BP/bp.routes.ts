import { Router } from "express";
import { createBloodPressureEntry, getBloodPressureReadings } from "./bp.controller.js";

const router = Router();

router.get("/", getBloodPressureReadings);
router.post("/", createBloodPressureEntry);

export default router;