import express from "express";
import {
    getAllProgressNotes,
    getProgressNoteById,
    getProgressNotesByPatientId,
    createProgressNoteHandler,
    updateProgressNote,
    deleteProgressNote
} from "../controllers/progressNote.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All progress note routes require authentication
router.use(protect);

// GET /api/progress-notes/patient/:patientId — all notes for a patient
router.get("/patient/:patientId", getProgressNotesByPatientId);

// GET /api/progress-notes — list (with filters: patientId, doctorId, encounterId, noteType, from, to)
router.get("/", getAllProgressNotes);

// GET /api/progress-notes/:id — single progress note
router.get("/:id", getProgressNoteById);

// POST /api/progress-notes — create (Doctors and Nurses only)
router.post("/", authorize("Doctor", "Nurse", "Admin"), createProgressNoteHandler);

// PUT /api/progress-notes/:id — update
router.put("/:id", authorize("Doctor", "Nurse", "Admin"), updateProgressNote);

// DELETE /api/progress-notes/:id — delete (Doctors and Admin only)
router.delete("/:id", authorize("Doctor", "Admin"), deleteProgressNote);

export default router;
