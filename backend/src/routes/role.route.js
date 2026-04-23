import express from "express";
import { getAllRoles, getRoleById, createRoleHandler, updateRole, deleteRole } from "../controllers/role.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get('/', protect, getAllRoles);
router.get('/:id', protect, getRoleById);
router.post('/', protect, authorize("Admin"), createRoleHandler );
router.put('/:id', protect, authorize("Admin"), updateRole);
router.delete('/:id', protect, authorize("Admin"), deleteRole);

export default router;