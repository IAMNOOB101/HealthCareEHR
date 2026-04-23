import { MedicalHistory, Patient } from "../models/index.js";
import { getPagination, getPagingData } from "../utils/pagination.js";

// GET /api/medical-history
const getAllMedicalHistory = async (req, res) => {
    const { patientId } = req.query;

    try {
        const where = {};
        if (patientId) where.patientId = patientId;

        const { limit, offset, page } = getPagination(req.query, 50);

        const data = await MedicalHistory.findAndCountAll({
            where,
            include: [{ model: Patient, attributes: ["id", "firstName", "lastName"] }],
            order: [["diagnosisDate", "DESC"]],
            limit,
            offset
        });

        const response = getPagingData(data, page, limit);
        return res.status(200).json({ success: true, ...response });
    } catch (err) {
        console.error("getAllMedicalHistory error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/medical-history/:id
const getMedicalHistoryById = async (req, res) => {
    try {
        const record = await MedicalHistory.findByPk(req.params.id, {
            include: [{ model: Patient, attributes: ["id", "firstName", "lastName"] }]
        });
        if (!record)
            return res.status(404).json({ success: false, message: "Medical history not found" });

        return res.status(200).json({ success: true, data: record });
    } catch (err) {
        console.error("getMedicalHistoryById error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/medical-history/patient/:patientId
const getMedicalHistoryByPatientId = async (req, res) => {
    try {
        const patient = await Patient.findByPk(req.params.patientId);
        if (!patient)
            return res.status(404).json({ success: false, message: "Patient not found" });

        const { limit, offset, page } = getPagination(req.query, 50);

        const data = await MedicalHistory.findAndCountAll({
            where: { patientId: req.params.patientId },
            order: [["diagnosisDate", "DESC"]],
            limit,
            offset
        });

        const response = getPagingData(data, page, limit);
        return res.status(200).json({ success: true, ...response });
    } catch (err) {
        console.error("getMedicalHistoryByPatientId error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// POST /api/medical-history
const createMedicalHistoryHandler = async (req, res) => {
    const { patientId, conditionName, diagnosisDate, notes } = req.body;

    const missing = [];
    if (!patientId)     missing.push("patientId");
    if (!conditionName) missing.push("conditionName");
    if (!diagnosisDate) missing.push("diagnosisDate");

    if (missing.length > 0)
        return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(", ")}` });

    try {
        const patient = await Patient.findByPk(patientId);
        if (!patient)
            return res.status(404).json({ success: false, message: "Patient not found" });

        // Prevent duplicate condition for same patient
        const exists = await MedicalHistory.findOne({
            where: {
                patientId,
                conditionName: conditionName.trim()
            }
        });
        if (exists)
            return res.status(409).json({ success: false, message: "This condition already exists for this patient" });

        const record = await MedicalHistory.create({ patientId, conditionName, diagnosisDate, notes });
        return res.status(201).json({ success: true, data: record });
    } catch (err) {
        console.error("createMedicalHistory error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// PUT /api/medical-history/:id
const updateMedicalHistory = async (req, res) => {
    try {
        const record = await MedicalHistory.findByPk(req.params.id);
        if (!record)
            return res.status(404).json({ success: false, message: "Medical history not found" });

        // Prevent patientId from being changed
        const { patientId: _, ...updateData } = req.body;
        await record.update(updateData);

        return res.status(200).json({ success: true, data: record });
    } catch (err) {
        console.error("updateMedicalHistory error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// DELETE /api/medical-history/:id
const deleteMedicalHistory = async (req, res) => {
    try {
        const record = await MedicalHistory.findByPk(req.params.id);
        if (!record)
            return res.status(404).json({ success: false, message: "Medical history record not found" });

        await record.destroy();
        return res.status(200).json({ success: true, message: "Medical history record deleted successfully" });
    } catch (err) {
        console.error("deleteMedicalHistory error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export {
    getAllMedicalHistory,
    getMedicalHistoryById,
    getMedicalHistoryByPatientId,
    createMedicalHistoryHandler,
    updateMedicalHistory,
    deleteMedicalHistory
};
