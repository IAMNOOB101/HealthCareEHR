import express from "express";
import { getMySummary, getMyEncounters, exportMedicalRecords } from "../../controllers/portal/records.portal.controller.js";
import { protectPortal } from "../../middlewares/portalAuth.middleware.js";

const router = express.Router();

router.use(protectPortal);

router.get("/summary", getMySummary);
router.get("/encounters", getMyEncounters);
router.get("/export", exportMedicalRecords);

export default router;
