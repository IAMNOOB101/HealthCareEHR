import express from "express";
import {
    patientRegister, patientLogin, verifyEmail, getPortalMe,
    forgotPortalPassword, verifyPortalOtp, resetPortalPassword,
} from "../../controllers/portal/auth.portal.controller.js";
import { protectPortal } from "../../middlewares/portalAuth.middleware.js";

const router = express.Router();

router.post("/register",          patientRegister);
router.post("/login",             patientLogin);
router.get("/verify/:token",      verifyEmail);
router.get("/me",                 protectPortal, getPortalMe);

// ── Patient Password Reset ────────────────────────────────────────────────────
router.post("/forgot-password",   forgotPortalPassword);  // Step 1: request OTP
router.post("/verify-otp",        verifyPortalOtp);        // Step 2: verify OTP
router.post("/reset-password",    resetPortalPassword);    // Step 3: set new password

export default router;
