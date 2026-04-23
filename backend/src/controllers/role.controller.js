import { Op } from "sequelize";
import { Role } from "../models/index.js";

// GET /api/roles
const getAllRoles = async (req, res) => {
    try {
        const roles = await Role.findAll({ order: [["id", "ASC"]] });
        return res.status(200).json({ success: true, count: roles.length, data: roles });
    } catch (err) {
        console.error("getAllRoles error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/roles/:id
const getRoleById = async (req, res) => {
    try {
        const role = await Role.findByPk(req.params.id);
        if (!role)
            return res.status(404).json({ success: false, message: "Role not found" });

        return res.status(200).json({ success: true, data: role });
    } catch (err) {
        console.error("getRoleById error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// POST /api/roles
const createRoleHandler = async (req, res) => {
    const { roleName, description } = req.body;

    if (!roleName)
        return res.status(400).json({ success: false, message: "roleName is required" });

    try {
        const exists = await Role.findOne({ where: { roleName: { [Op.iLike]: roleName } } });
        if (exists)
            return res.status(409).json({ success: false, message: "Role already exists" });

        const role = await Role.create({ roleName, description });
        return res.status(201).json({ success: true, data: role });
    } catch (err) {
        console.error("createRole error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// PUT /api/roles/:id
const updateRole = async (req, res) => {
    try {
        const role = await Role.findByPk(req.params.id);
        if (!role)
            return res.status(404).json({ success: false, message: "Role not found" });

        await role.update(req.body);
        return res.status(200).json({ success: true, data: role });
    } catch (err) {
        console.error("updateRole error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// DELETE /api/roles/:id
const deleteRole = async (req, res) => {
    try {
        const role = await Role.findByPk(req.params.id);
        if (!role)
            return res.status(404).json({ success: false, message: "Role not found" });

        await role.destroy();
        return res.status(200).json({ success: true, message: "Role deleted successfully" });
    } catch (err) {
        console.error("deleteRole error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export { getAllRoles, getRoleById, createRoleHandler, updateRole, deleteRole };