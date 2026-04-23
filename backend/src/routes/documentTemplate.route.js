import express from "express";
import {
    getAllTemplates,
    getTemplateById,
    getTemplatesBySpecialty,
    createTemplateHandler,
    updateTemplate,
    deactivateTemplate,
    deleteTemplate
} from "../controllers/documentTemplate.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All template routes require authentication
router.use(protect);

// GET /api/templates                        — list all (supports ?specialty=&name=&activeOnly=true)
router.get("/",                              getAllTemplates);

// GET /api/templates/specialty/:specialty   — all active templates for a specialty
// NOTE: this must be before /:id to avoid "specialty" being matched as an id
router.get("/specialty/:specialty",          getTemplatesBySpecialty);

// GET /api/templates/:id                    — single template
router.get("/:id",                           getTemplateById);

// POST /api/templates                       — create (Doctors, Admin)
router.post("/",   authorize("Doctor", "Admin"),          createTemplateHandler);

// PUT /api/templates/:id                    — update
router.put("/:id", authorize("Doctor", "Admin"),          updateTemplate);

// PATCH /api/templates/:id/deactivate       — soft deactivate
router.patch("/:id/deactivate", authorize("Doctor", "Admin"), deactivateTemplate);

// DELETE /api/templates/:id                 — hard delete (Admin only)
router.delete("/:id", authorize("Admin"),                 deleteTemplate);

export default router;
