import express from "express";
import {
    getAllEncounterNotes,
    getEncounterNoteById,
    getEncounterNotesByPatientId,
    getEncounterNotesByDoctorId,
    createEncounterNoteHandler,
    updateEncounterNote,
    deleteEncounterNote
} from "../controllers/encounterNote.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { createEncounterNoteSchema, updateEncounterNoteSchema } from "../validators/encounterNote.validator.js";

const router = express.Router();

// Specific routes before parameterized routes
router.get("/patient/:patientId", protect, getEncounterNotesByPatientId);
router.get("/doctor/:doctorId",   protect, getEncounterNotesByDoctorId);
router.get("/",                   protect, getAllEncounterNotes);
router.get("/:id",                protect, getEncounterNoteById);
router.post("/",                  protect, authorize("Admin", "Doctor", "Nurse"), validate(createEncounterNoteSchema), createEncounterNoteHandler);
router.put("/:id",                protect, authorize("Admin", "Doctor", "Nurse"), validate(updateEncounterNoteSchema), updateEncounterNote);
router.delete("/:id",             protect, authorize("Admin"),                      deleteEncounterNote);

export default router;