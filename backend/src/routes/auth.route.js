import express from "express";
import {
    register, login, getMe, deactivateUser,
    forgotPassword, verifyOtp, resetPassword,
} from "../controllers/auth.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register",         register);
router.post("/login",            login);
router.get("/me",                protect, getMe);
router.put("/deactivate/:id",    protect, authorize("Admin"), deactivateUser);

// ── Password Reset ────────────────────────────────────────────────────────────
router.post("/forgot-password",  forgotPassword);   // Step 1: request OTP
router.post("/verify-otp",       verifyOtp);         // Step 2: verify OTP → get resetSessionToken
router.post("/reset-password",   resetPassword);     // Step 3: set new password

export default router;