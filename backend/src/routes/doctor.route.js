import express from 'express';
import { getAllDoctors, getDoctorById, createDoctorHandler, updateDoctor, deleteDoctor, deactivateDoctor } from '../controllers/doctor.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import validate from "../middlewares/validate.middleware.js";
import { createDoctorV, updateDoctorV } from "../validators/doctor.validator.js";

const router = express.Router();

router.get("/", protect, getAllDoctors);
router.get("/:id", protect, getDoctorById);
router.post("/", protect, authorize("Admin"), validate(createDoctorV), createDoctorHandler);
router.put("/:id", protect, authorize("Admin"), validate(updateDoctorV), updateDoctor);
router.patch("/:id/deactivate", protect, authorize("Admin"), deactivateDoctor);
router.delete("/:id", protect, authorize("Admin"), deleteDoctor);

export default router;