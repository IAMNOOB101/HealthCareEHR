import { Patient, EncounterNote, Prescription, LabOrder, LabResult, MedicalHistory, Appointment, Doctor } from "../../models/index.js";

// GET /portal/records/summary
export const getMySummary = async (req, res) => {
    try {
        const pId = req.portalUser.patientId;
        const patient = await Patient.findByPk(pId, {
            attributes: ["firstName", "lastName", "dateOfBirth", "gender"]
        });

        // 1. Next 3 Appointments
        const { Op } = await import("sequelize");
        const appointments = await Appointment.findAll({
            where: { patientId: pId, status: "Scheduled", appointmentDate: { [Op.gt]: new Date() } },
            include: [{ model: Doctor, attributes: ["firstName", "lastName"] }],
            order: [["appointmentDate", "ASC"]],
            limit: 3
        });

        // 2. Currently active prescriptions
        const prescriptions = await Prescription.findAll({
            where: { patientId: pId, status: "Active" },
            include: [{ model: Doctor, attributes: ["firstName", "lastName"] }],
            limit: 5
        });

        // 3. Active medical history conditions
        const conditions = await MedicalHistory.findAll({
            where: { patientId: pId, status: "Active" }
        });

        const summary = {
            patient,
            upcomingAppointments: appointments,
            activePrescriptions: prescriptions,
            activeConditions: conditions
        };

        return res.status(200).json({ success: true, data: summary });
    } catch (err) {
        console.error("getMySummary error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /portal/records/encounters
export const getMyEncounters = async (req, res) => {
    try {
        const encounters = await EncounterNote.findAll({
            where: { patientId: req.portalUser.patientId },
            attributes: ["id", "encounterDate", "diagnosis", "plan"], // Do not return subjective/objective notes to patients
            include: [{ model: Doctor, attributes: ["firstName", "lastName"] }],
            order: [["encounterDate", "DESC"]]
        });
        return res.status(200).json({ success: true, data: encounters });
    } catch (err) {
        console.error("getMyEncounters error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /portal/records/export
export const exportMedicalRecords = async (req, res) => {
    try {
        const pId = req.portalUser.patientId;

        const patient = await Patient.findByPk(pId, { attributes: ["firstName", "lastName", "dateOfBirth", "gender"] });
        
        const history = await MedicalHistory.findAll({ where: { patientId: pId } });
        
        const encounters = await EncounterNote.findAll({
            where: { patientId: pId },
            attributes: ["encounterDate", "diagnosis", "plan"], // Safe fields only
        });
        
        const prescriptions = await Prescription.findAll({
            where: { patientId: pId },
            attributes: ["medicationId", "dosage", "frequency", "duration", "status"]
        });

        const _labResults = await LabResult.findAll({
            include: [{
                model: LabOrder,
                required: true,
                where: { patientId: pId },
                attributes: ["testType", "orderDate"]
            }],
            attributes: ["resultValue", "unit", "referenceRange", "status", "resultDate"]
        });

        const exportData = {
            exportedAt: new Date().toISOString(),
            patient,
            medicalHistory: history,
            encounters,
            prescriptions,
            labResults: _labResults
        };

        // Standard JSON export (meets basic HIPAA readability rules)
        return res.status(200).json({ success: true, data: exportData });

    } catch (err) {
        console.error("exportMedicalRecords error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
