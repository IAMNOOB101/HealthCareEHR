import express from "express";
import {
    getAllLabOrders,
    getLabOrderById,
    getLabOrdersByPatientId,
    getLabOrdersByDoctorId,
    createLabOrderHandler,
    updateLabOrder,
    deleteLabOrder
} from "../controllers/labOrder.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { createLabOrderV, updateLabOrderV } from "../validators/labOrder.validator.js";

const router = express.Router();

router.get("/patient/:patientId", protect, getLabOrdersByPatientId);
router.get("/doctor/:doctorId",   protect, getLabOrdersByDoctorId);
router.get("/",                   protect, getAllLabOrders);
router.get("/:id",                protect, getLabOrderById);
router.post("/",                  protect, authorize("Admin", "Doctor"), validate(createLabOrderV),                       createLabOrderHandler);
router.put("/:id",                protect, authorize("Admin", "Doctor", "Lab Technician"), validate(updateLabOrderV),     updateLabOrder);
router.delete("/:id",             protect, authorize("Admin", "Doctor"),                        deleteLabOrder);

export default router;