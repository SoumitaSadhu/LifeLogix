import { Router } from "express";
import { getCurrentUser, logout, refreshSession, sendOtp, verifyOtp } from "./user.controller.js";

const router = Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.get("/me", getCurrentUser);
router.post("/refresh", refreshSession);
router.post("/logout", logout);

export default router;