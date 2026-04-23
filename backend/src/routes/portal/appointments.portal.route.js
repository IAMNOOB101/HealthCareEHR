import express from "express";
import { getMyAppointments, getMyAppointmentHistory, requestAppointment, cancelAppointment } from "../../controllers/portal/appointments.portal.controller.js";
import { protectPortal } from "../../middlewares/portalAuth.middleware.js";

const router = express.Router();

// All routes here should be protected by protectPortal in server.js, but explicitly doing it here too.
router.use(protectPortal);

router.get("/", getMyAppointments);
router.get("/history", getMyAppointmentHistory);
router.post("/request", requestAppointment);
router.patch("/:id/cancel", cancelAppointment);

export default router;
