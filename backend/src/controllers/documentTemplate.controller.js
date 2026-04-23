import { Op } from "sequelize";
import { DocumentTemplate, User } from "../models/index.js";

const VALID_SPECIALTIES = [
    "General Practice", "Cardiology", "Orthopedics", "Neurology",
    "Pediatrics", "Oncology", "Dermatology", "Psychiatry",
    "Radiology", "Emergency Medicine", "Obstetrics & Gynecology",
    "Gastroenterology", "Endocrinology", "Pulmonology", "Nephrology"
];

// GET /api/templates
const getAllTemplates = async (req, res) => {
    const { specialty, name, activeOnly } = req.query;

    try {
        const where = {};
        if (specialty)              where.specialty     = specialty;
        if (name)                   where.templateName  = { [Op.iLike]: `%${name}%` };
        if (activeOnly === "true")  where.isActive      = true;

        const templates = await DocumentTemplate.findAll({
            where,
            include: [{ model: User, as: "creator", attributes: ["id", "username"] }],
            order: [["specialty", "ASC"], ["templateName", "ASC"]]
        });

        return res.status(200).json({ success: true, count: templates.length, data: templates });
    } catch (err) {
        console.error("getAllTemplates error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/templates/:id
const getTemplateById = async (req, res) => {
    try {
        const template = await DocumentTemplate.findByPk(req.params.id, {
            include: [{ model: User, as: "creator", attributes: ["id", "username"] }]
        });

        if (!template)
            return res.status(404).json({ success: false, message: "Template not found" });

        return res.status(200).json({ success: true, data: template });
    } catch (err) {
        console.error("getTemplateById error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/templates/specialty/:specialty
const getTemplatesBySpecialty = async (req, res) => {
    const specialty = decodeURIComponent(req.params.specialty);

    if (!VALID_SPECIALTIES.includes(specialty))
        return res.status(400).json({
            success: false,
            message: `Invalid specialty. Must be one of: ${VALID_SPECIALTIES.join(", ")}`
        });

    try {
        const templates = await DocumentTemplate.findAll({
            where: { specialty, isActive: true },
            include: [{ model: User, as: "creator", attributes: ["id", "username"] }],
            order: [["templateName", "ASC"]]
        });

        return res.status(200).json({ success: true, count: templates.length, data: templates });
    } catch (err) {
        console.error("getTemplatesBySpecialty error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// POST /api/templates
const createTemplateHandler = async (req, res) => {
    const { templateName, specialty, sections, description } = req.body;

    const missing = [];
    if (!templateName) missing.push("templateName");
    if (!specialty)    missing.push("specialty");
    if (!sections)     missing.push("sections");

    if (missing.length > 0)
        return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(", ")}` });

    if (!VALID_SPECIALTIES.includes(specialty))
        return res.status(400).json({
            success: false,
            message: `Invalid specialty. Must be one of: ${VALID_SPECIALTIES.join(", ")}`
        });

    if (!Array.isArray(sections))
        return res.status(400).json({ success: false, message: "sections must be an array" });

    // Validate section structure: each must have a sectionName
    const invalidSection = sections.find(s => !s.sectionName);
    if (invalidSection)
        return res.status(400).json({ success: false, message: "Each section must include a sectionName" });

    try {
        // Prevent duplicate template name within same specialty
        const exists = await DocumentTemplate.findOne({
            where: {
                templateName: { [Op.iLike]: templateName },
                specialty
            }
        });
        if (exists)
            return res.status(409).json({
                success: false,
                message: "A template with this name already exists for this specialty"
            });

        // createdBy comes from the authenticated user's JWT
        const createdBy = req.user?.userId;
        if (!createdBy)
            return res.status(401).json({ success: false, message: "Authentication required" });

        const template = await DocumentTemplate.create({
            templateName, specialty, sections,
            description: description || null,
            createdBy
        });

        return res.status(201).json({ success: true, data: template });
    } catch (err) {
        console.error("createTemplate error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// PUT /api/templates/:id
const updateTemplate = async (req, res) => {
    try {
        const template = await DocumentTemplate.findByPk(req.params.id);
        if (!template)
            return res.status(404).json({ success: false, message: "Template not found" });

        if (req.body.specialty && !VALID_SPECIALTIES.includes(req.body.specialty))
            return res.status(400).json({
                success: false,
                message: `Invalid specialty. Must be one of: ${VALID_SPECIALTIES.join(", ")}`
            });

        if (req.body.sections && !Array.isArray(req.body.sections))
            return res.status(400).json({ success: false, message: "sections must be an array" });

        // Prevent createdBy from being changed
        const { createdBy: _, ...updateData } = req.body;
        await template.update(updateData);

        return res.status(200).json({ success: true, data: template });
    } catch (err) {
        console.error("updateTemplate error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// PATCH /api/templates/:id/deactivate
const deactivateTemplate = async (req, res) => {
    try {
        const template = await DocumentTemplate.findByPk(req.params.id);
        if (!template)
            return res.status(404).json({ success: false, message: "Template not found" });

        await template.update({ isActive: false });
        return res.status(200).json({ success: true, message: "Template deactivated successfully" });
    } catch (err) {
        console.error("deactivateTemplate error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// DELETE /api/templates/:id
const deleteTemplate = async (req, res) => {
    try {
        const template = await DocumentTemplate.findByPk(req.params.id);
        if (!template)
            return res.status(404).json({ success: false, message: "Template not found" });

        await template.destroy();
        return res.status(200).json({ success: true, message: "Template deleted successfully" });
    } catch (err) {
        console.error("deleteTemplate error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export {
    getAllTemplates,
    getTemplateById,
    getTemplatesBySpecialty,
    createTemplateHandler,
    updateTemplate,
    deactivateTemplate,
    deleteTemplate,
    VALID_SPECIALTIES
};
