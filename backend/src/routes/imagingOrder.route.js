import express from "express";
import {
    getAllImagingOrders,
    getImagingOrderById,
    getImagingOrdersByPatientId,
    getImagingOrdersByDoctorId,
    createImagingOrderHandler,
    updateImagingOrder,
    cancelImagingOrder
} from "../controllers/imagingOrder.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { createImagingOrderV, updateImagingOrderV } from "../validators/imagingOrder.validator.js";

const router = express.Router();

// All imaging order routes require authentication
router.use(protect);

// GET /api/imaging-orders/patient/:patientId — must be before /:id
router.get("/patient/:patientId", getImagingOrdersByPatientId);

// GET /api/imaging-orders/doctor/:doctorId — must be before /:id
router.get("/doctor/:doctorId", getImagingOrdersByDoctorId);

// GET /api/imaging-orders — list all (supports ?patientId=, ?doctorId=, ?imagingType=, ?priority=, ?status=)
router.get("/", getAllImagingOrders);

// GET /api/imaging-orders/:id — single order with full associations
router.get("/:id", getImagingOrderById);

// POST /api/imaging-orders — create (Doctors and Admin only)
router.post("/", authorize("Admin", "Doctor"), validate(createImagingOrderV), createImagingOrderHandler);

// PUT /api/imaging-orders/:id — update (Doctors, Admin — blocked on terminal statuses)
router.put("/:id", authorize("Admin", "Doctor"), validate(updateImagingOrderV), updateImagingOrder);

// DELETE /api/imaging-orders/:id — soft cancel (Doctors and Admin)
router.delete("/:id", authorize("Admin", "Doctor"), cancelImagingOrder);

export default router;
