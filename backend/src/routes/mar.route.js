import express from "express";
import {
    getAllMAREntries,
    getMAREntryById,
    getMARByPatientId,
    getMARByPrescriptionId,
    getMissedDoses,
    createMAREntry,
    updateMAREntry
} from "../controllers/mar.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { createMarV } from "../validators/mar.validator.js";

const router = express.Router();

// All MAR routes require authentication
router.use(protect);

// GET /api/mar/missed — clinical safety view of all missed doses (must be before /:id)
router.get("/missed", authorize("Admin", "Doctor", "Nurse", "Pharmacist"), getMissedDoses);

// GET /api/mar/patient/:patientId — full administration timeline for a patient
router.get("/patient/:patientId", getMARByPatientId);

// GET /api/mar/prescription/:prescriptionId — all doses for a specific prescription
router.get("/prescription/:prescriptionId", getMARByPrescriptionId);

// GET /api/mar — list all (supports ?patientId=, ?prescriptionId=, ?medicationId=, ?status=, ?administeredBy=)
router.get("/", getAllMAREntries);

// GET /api/mar/:id — single MAR entry
router.get("/:id", getMAREntryById);

// POST /api/mar — record a dose administration (Doctors, Nurses, Pharmacists)
router.post("/", authorize("Admin", "Doctor", "Nurse", "Pharmacist"), validate(createMarV), createMAREntry);

// PUT /api/mar/:id — update a MAR entry (Doctors, Nurses, Admin)
router.put("/:id", authorize("Admin", "Doctor", "Nurse"), updateMAREntry);

export default router;
