import { Prescription, Patient, Doctor, Medication, sequelize } from "../models/index.js";
import integrations from "../integrations/index.js";
import { checkDrugInteractions } from "../utils/drugInteractionChecker.js";
import { getPagination, getPagingData } from "../utils/pagination.js";
import GlobalTaskQueue from "../services/queue.service.js";

const VALID_STATUSES = ["Active", "Completed", "Cancelled", "Upcoming"];

// GET /api/prescriptions
const getAllPrescriptions = async (req, res) => {
    const { patientId, doctorId, status } = req.query;

    try {
        const where = {};
        if (patientId) where.patientId = patientId;
        if (doctorId)  where.doctorId  = doctorId;
        if (status)    where.status    = status;

        const { limit, offset, page } = getPagination(req.query, 50);

        const data = await Prescription.findAndCountAll({
            where,
            include: [
                { model: Patient,    attributes: ["id", "firstName", "lastName"] },
                { model: Doctor,     attributes: ["id", "firstName", "lastName"] },
                { model: Medication, attributes: ["id", "medicationName", "dosage", "category"] }
            ],
            order: [["updatedAt", "DESC"]],
            limit,
            offset
        });

        const response = getPagingData(data, page, limit);
        return res.status(200).json({ success: true, ...response });
    } catch (err) {
        console.error("getAllPrescriptions error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/prescriptions/:id
const getPrescriptionById = async (req, res) => {
    try {
        const prescription = await Prescription.findByPk(req.params.id, {
            include: [
                { model: Patient,    attributes: ["id", "firstName", "lastName"] },
                { model: Doctor,     attributes: ["id", "firstName", "lastName"] },
                { model: Medication, attributes: ["id", "medicationName", "dosage", "category"] }
            ]
        });
        if (!prescription)
            return res.status(404).json({ success: false, message: "Prescription not found" });

        return res.status(200).json({ success: true, data: prescription });
    } catch (err) {
        console.error("getPrescriptionById error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/prescriptions/patient/:patientId
const getPrescriptionsByPatientId = async (req, res) => {
    try {
        const patient = await Patient.findByPk(req.params.patientId);
        if (!patient)
            return res.status(404).json({ success: false, message: "Patient not found" });

        const { limit, offset, page } = getPagination(req.query, 50);

        const data = await Prescription.findAndCountAll({
            where: { patientId: req.params.patientId },
            include: [
                { model: Medication, attributes: ["id", "medicationName", "dosage"] },
                { model: Doctor,     attributes: ["id", "firstName", "lastName"] }
            ],
            order: [["prescriptionDate", "DESC"]],
            limit,
            offset
        });

        const response = getPagingData(data, page, limit);
        return res.status(200).json({ success: true, ...response });
    } catch (err) {
        console.error("getPrescriptionsByPatientId error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// POST /api/prescriptions
const createPrescriptionHandler = async (req, res) => {
    const { patientId, doctorId, medicationId, prescriptionDate, dosage, frequency, duration, refills, notes } = req.body;

    const missing = [];
    if (!patientId)        missing.push("patientId");
    if (!doctorId)         missing.push("doctorId");
    if (!medicationId)     missing.push("medicationId");
    if (!prescriptionDate) missing.push("prescriptionDate");
    if (!dosage)           missing.push("dosage");
    if (!frequency)        missing.push("frequency");
    if (!duration)         missing.push("duration");

    if (missing.length > 0)
        return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(", ")}` });

    try {
        const patient = await Patient.findByPk(patientId);
        if (!patient)
            return res.status(404).json({ success: false, message: "Patient not found" });

        const doctor = await Doctor.findByPk(doctorId);
        if (!doctor)
            return res.status(404).json({ success: false, message: "Doctor not found" });
        if (!doctor.isActive)
            return res.status(400).json({ success: false, message: "Doctor is not active" });

        const medication = await Medication.findByPk(medicationId);
        if (!medication)
            return res.status(404).json({ success: false, message: "Medication not found" });
        if (!medication.isActive)
            return res.status(400).json({ success: false, message: "Medication is not active" });

        // Drug interaction check using active prescriptions
        const activePrescriptions = await Prescription.findAll({
            where: { patientId, status: "Active" },
            attributes: ["medicationId"]
        });
        const activeMedicationIds = activePrescriptions.map(p => String(p.medicationId));
        const interactions = await checkDrugInteractions(medicationId, activeMedicationIds);

        if (interactions.length > 0)
            return res.status(409).json({
                success: false,
                message: "Drug interaction detected",
                interactions
            });

        const t = await sequelize.transaction();
        try {
            const prescription = await Prescription.create({
                patientId, doctorId, medicationId, prescriptionDate,
                dosage, frequency, duration,
                refills: refills || 0,
                notes
            }, { transaction: t });

            await t.commit();

            // [Phase 3] Integration: Offload to background Task Queue
            GlobalTaskQueue.push({
                name: `Sync-Prescription-${prescription.id}`,
                fn: () => integrations.pharmacy.sendPrescription(prescription)
            });

            return res.status(202).json({ 
                success: true, 
                message: "Prescription created and queued for pharmacy synchronization",
                data: prescription 
            });

        } catch (innerErr) {
            if (t) await t.rollback();
            throw innerErr;
        }

    } catch (err) {
        console.error("createPrescription error:", err.message || err);
        if (err.message && err.message.includes("Mock")) {
            return res.status(502).json({ success: false, message: "External Pharmacy Integration Failed. Operation rolled back." });
        }
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// PUT /api/prescriptions/:id
const updatePrescription = async (req, res) => {
    try {
        const prescription = await Prescription.findByPk(req.params.id);
        if (!prescription)
            return res.status(404).json({ success: false, message: "Prescription not found" });

        if (req.body.status && !VALID_STATUSES.includes(req.body.status))
            return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });

        // Prevent FK overrides
        const { patientId: _, doctorId: __, medicationId: ___, ...updateData } = req.body;
        await prescription.update(updateData);

        return res.status(200).json({ success: true, data: prescription });
    } catch (err) {
        console.error("updatePrescription error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// DELETE /api/prescriptions/:id  (soft cancel)
const deletePrescription = async (req, res) => {
    try {
        const prescription = await Prescription.findByPk(req.params.id);
        if (!prescription)
            return res.status(404).json({ success: false, message: "Prescription not found" });

        await prescription.update({ status: "Cancelled" });
        return res.status(200).json({ success: true, message: "Prescription cancelled successfully" });
    } catch (err) {
        console.error("deletePrescription error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export {
    getAllPrescriptions,
    getPrescriptionById,
    getPrescriptionsByPatientId,
    createPrescriptionHandler,
    updatePrescription,
    deletePrescription
};