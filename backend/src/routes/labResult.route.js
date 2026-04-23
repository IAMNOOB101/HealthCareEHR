import express from "express";
import {
    getAllLabResults,
    getLabResultById,
    getLabResultsByOrderId,
    getCriticalLabResults,
    createLabResultHandler,
    updateLabResult,
    deleteLabResult
} from "../controllers/labResult.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { createLabResultSchema, updateLabResultSchema } from "../validators/labResult.validator.js";

const router = express.Router();

// Specific routes before parameterized routes
router.get("/critical",           protect, getCriticalLabResults);
router.get("/order/:labOrderId",  protect, getLabResultsByOrderId);
router.get("/",                   protect, getAllLabResults);
router.get("/:id",                protect, getLabResultById);
router.post("/",                  protect, authorize("Admin", "Doctor", "Lab Technician"), validate(createLabResultSchema), createLabResultHandler);
router.put("/:id",                protect, authorize("Admin", "Doctor", "Lab Technician"), validate(updateLabResultSchema), updateLabResult);
router.delete("/:id",             protect, authorize("Admin"),                            deleteLabResult);

export default router;