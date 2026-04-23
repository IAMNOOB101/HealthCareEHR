import express from "express";
import {
    getAvailableDoctors,
    getPatientChatHistory,
    markPatientChatRead,
} from "../../controllers/chat.controller.js";
import { protectPortal } from "../../middlewares/portalAuth.middleware.js";

const router = express.Router();

// All portal chat routes require patient authentication
router.use(protectPortal);

// GET /portal/chat/doctors — list doctors patient can contact
router.get("/doctors", getAvailableDoctors);

// GET /portal/chat/history/:doctorId — conversation history
router.get("/history/:doctorId", getPatientChatHistory);

// PATCH /portal/chat/read/:doctorId — mark messages read
router.patch("/read/:doctorId", markPatientChatRead);

export default router;
