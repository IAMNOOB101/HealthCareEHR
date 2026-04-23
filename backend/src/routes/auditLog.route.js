import express from "express";
import {
    getAllAuditLogs,
    getAuditLogsByResource
} from "../controllers/auditLog.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Only Admins should be able to view audit logs for compliance
router.get("/",                                  protect, authorize("Admin"), getAllAuditLogs);
router.get("/resource/:resource/:resourceId",    protect, authorize("Admin"), getAuditLogsByResource);

export default router;
