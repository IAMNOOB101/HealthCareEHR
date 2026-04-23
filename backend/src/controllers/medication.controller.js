import { Op } from "sequelize";
import { Medication } from "../models/index.js";

// GET /api/medications
const getAllMedications = async (req, res) => {
    const { category, name } = req.query;

    try {
        const where = {};
        if (category) where.category = { [Op.iLike]: category };
        if (name)     where.medicationName = { [Op.iLike]: `%${name}%` };

        const medications = await Medication.findAll({ where });
        return res.status(200).json({ success: true, count: medications.length, data: medications });
    } catch (err) {
        console.error("getAllMedications error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/medications/:id
const getMedicationById = async (req, res) => {
    try {
        const medication = await Medication.findByPk(req.params.id);
        if (!medication)
            return res.status(404).json({ success: false, message: "Medication not found" });

        return res.status(200).json({ success: true, data: medication });
    } catch (err) {
        console.error("getMedicationById error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// POST /api/medications
const createMedicationHandler = async (req, res) => {
    const { medicationName, dosage, instructions, category, sideEffects, contraindications } = req.body;

    const missing = [];
    if (!medicationName) missing.push("medicationName");
    if (!dosage)         missing.push("dosage");
    if (!instructions)   missing.push("instructions");
    if (!category)       missing.push("category");

    if (missing.length > 0)
        return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(", ")}` });

    if (sideEffects && !Array.isArray(sideEffects))
        return res.status(400).json({ success: false, message: "sideEffects must be an array" });

    if (contraindications && !Array.isArray(contraindications))
        return res.status(400).json({ success: false, message: "contraindications must be an array" });

    try {
        const exists = await Medication.findOne({
            where: {
                medicationName: { [Op.iLike]: medicationName },
                dosage:         { [Op.iLike]: dosage }
            }
        });
        if (exists)
            return res.status(409).json({ success: false, message: "Medication with this name and dosage already exists" });

        const medication = await Medication.create({
            medicationName, dosage, instructions, category,
            sideEffects:       sideEffects       || [],
            contraindications: contraindications || []
        });

        return res.status(201).json({ success: true, data: medication });
    } catch (err) {
        console.error("createMedication error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// PUT /api/medications/:id
const updateMedication = async (req, res) => {
    try {
        const medication = await Medication.findByPk(req.params.id);
        if (!medication)
            return res.status(404).json({ success: false, message: "Medication not found" });

        if (req.body.sideEffects && !Array.isArray(req.body.sideEffects))
            return res.status(400).json({ success: false, message: "sideEffects must be an array" });

        if (req.body.contraindications && !Array.isArray(req.body.contraindications))
            return res.status(400).json({ success: false, message: "contraindications must be an array" });

        await medication.update(req.body);
        return res.status(200).json({ success: true, data: medication });
    } catch (err) {
        console.error("updateMedication error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// DELETE /api/medications/:id  (soft deactivate)
const deleteMedication = async (req, res) => {
    try {
        const medication = await Medication.findByPk(req.params.id);
        if (!medication)
            return res.status(404).json({ success: false, message: "Medication not found" });

        await medication.update({ isActive: false });
        return res.status(200).json({ success: true, message: "Medication deactivated successfully" });
    } catch (err) {
        console.error("deleteMedication error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export { getAllMedications, getMedicationById, createMedicationHandler, updateMedication, deleteMedication };