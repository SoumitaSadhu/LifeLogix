import { Router } from "express";
import { createWeightEntry, getWeightReadings } from "./weight.controller.js";

const router = Router();

router.get("/", getWeightReadings);
router.post("/", createWeightEntry);

export default router;
