import express from "express";
import { getMyPrescriptions, getMyActivePrescriptions, getPrescriptionById } from "../../controllers/portal/prescriptions.portal.controller.js";
import { protectPortal } from "../../middlewares/portalAuth.middleware.js";

const router = express.Router();

router.use(protectPortal);

router.get("/", getMyPrescriptions);
router.get("/active", getMyActivePrescriptions);
router.get("/:id", getPrescriptionById);

export default router;
