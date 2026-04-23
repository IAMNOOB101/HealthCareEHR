import express from "express";
import {
    getAllReconciliations,
    getReconciliationById,
    getReconciliationsByPatientId,
    createReconciliation,
    updateReconciliation
} from "../controllers/medicationReconciliation.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All reconciliation routes require authentication
router.use(protect);

// GET /api/medication-reconciliation/patient/:patientId — must be before /:id
router.get("/patient/:patientId", getReconciliationsByPatientId);

// GET /api/medication-reconciliation — list all (supports ?patientId=, ?reconciledBy=, ?status=)
router.get("/", getAllReconciliations);

// GET /api/medication-reconciliation/:id — single reconciliation with full associations
router.get("/:id", getReconciliationById);

// POST /api/medication-reconciliation — create (Nurses, Pharmacists, Admin, Doctor)
// Auto-pulls active prescriptions + computes discrepancies
router.post("/", authorize("Admin", "Doctor", "Nurse", "Pharmacist"), createReconciliation);

// PUT /api/medication-reconciliation/:id — update (mark discrepancies resolved, change status)
// Blocked if status is already "Completed"
router.put("/:id", authorize("Admin", "Doctor", "Nurse", "Pharmacist"), updateReconciliation);

export default router;
