import express from "express";
import {
    getChatPatients,
    getAllPortalPatients,
    getEligiblePatients,
    getDoctorChatHistory,
    markDoctorChatRead,
} from "../controllers/chat.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Staff chat routes require a valid staff JWT and Doctor role
router.use(protect);
router.use(authorize("Doctor")); // Only Doctors can access the encrypted chat

// GET /api/chat/patients — patients with existing conversations
router.get("/patients", getChatPatients);

// GET /api/chat/eligible-patients — patients with recent appointments (can start new chat)
router.get("/eligible-patients", getEligiblePatients);

// GET /api/chat/all-patients — ALL portal patients (fallback)
router.get("/all-patients", getAllPortalPatients);

// GET /api/chat/history/:portalUserId — conversation history
router.get("/history/:portalUserId", getDoctorChatHistory);

// PATCH /api/chat/read/:portalUserId — mark messages read
router.patch("/read/:portalUserId", markDoctorChatRead);

export default router;
