import express from "express";
import {
  getAllMedications,
  getMedicationById,
  createMedicationHandler,
  updateMedication,
  deleteMedication,
} from "../controllers/medication.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", protect, getAllMedications);
router.get("/:id", protect, getMedicationById);
router.post(
  "/",
  protect,
  authorize("Admin", "Pharmacist"),
  createMedicationHandler,
);
router.put("/:id", protect, authorize("Admin", "Pharmacist"), updateMedication);
router.delete(
  "/:id",
  protect,
  authorize("Admin", "Pharmacist"),
  deleteMedication,
);

export default router;
