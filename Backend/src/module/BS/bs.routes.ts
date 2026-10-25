import { Router } from "express";
import { createBloodSugarEntry, getBloodSugarReadings } from "./bs.controller.js";

const router = Router();

router.get("/", getBloodSugarReadings);
router.post("/", createBloodSugarEntry);

export default router;
