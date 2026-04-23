import { Prescription, Medication, Patient, User } from "../models/index.js";
import MAR from "../models/mar.model.js";
import { getPagination, getPagingData } from "../utils/pagination.js";

const VALID_ROUTES   = ["Oral", "IV", "IM", "Subcutaneous", "Topical", "Inhaled", "Sublingual", "Rectal"];
const VALID_STATUSES = ["Given", "Missed", "Delayed", "Refused", "Held"];

// GET /api/mar
const getAllMAREntries = async (req, res) => {
    const { patientId, prescriptionId, medicationId, status, administeredBy } = req.query;

    try {
        const where = {};
        if (patientId)      where.patientId      = patientId;
        if (prescriptionId) where.prescriptionId = prescriptionId;
        if (medicationId)   where.medicationId   = medicationId;
        if (status)         where.status         = status;
        if (administeredBy) where.administeredBy = administeredBy;

        const { limit, offset, page } = getPagination(req.query, 50);

        const data = await MAR.findAndCountAll({
            where,
            include: [
                { model: Patient,       attributes: ["id", "firstName", "lastName"] },
                { model: Prescription,  attributes: ["id", "dosage", "frequency", "status"] },
                { model: Medication,    attributes: ["id", "medicationName", "dosage"] },
                { model: User,          as: "administrator", attributes: ["id", "username"] }
            ],
            order: [["scheduledAt", "DESC"]],
            limit,
            offset
        });

        const response = getPagingData(data, page, limit);
        return res.status(200).json({ success: true, ...response });
    } catch (err) {
        console.error("getAllMAREntries error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/mar/:id
const getMAREntryById = async (req, res) => {
    try {
        const entry = await MAR.findByPk(req.params.id, {
            include: [
                { model: Patient,       attributes: ["id", "firstName", "lastName"] },
                { model: Prescription,  attributes: ["id", "dosage", "frequency", "duration", "status"] },
                { model: Medication,    attributes: ["id", "medicationName", "dosage", "instructions"] },
                { model: User,          as: "administrator", attributes: ["id", "username"] }
            ]
        });

        if (!entry)
            return res.status(404).json({ success: false, message: "MAR entry not found" });

        return res.status(200).json({ success: true, data: entry });
    } catch (err) {
        console.error("getMAREntryById error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/mar/patient/:patientId
const getMARByPatientId = async (req, res) => {
    try {
        const patient = await Patient.findByPk(req.params.patientId);
        if (!patient)
            return res.status(404).json({ success: false, message: "Patient not found" });

        const { limit, offset, page } = getPagination(req.query, 50);

        const data = await MAR.findAndCountAll({
            where: { patientId: req.params.patientId },
            include: [
                { model: Medication,   attributes: ["id", "medicationName"] },
                { model: Prescription, attributes: ["id", "frequency", "duration"] },
                { model: User,         as: "administrator", attributes: ["id", "username"] }
            ],
            order: [["scheduledAt", "DESC"]],
            limit,
            offset
        });

        const response = getPagingData(data, page, limit);
        return res.status(200).json({ success: true, ...response });
    } catch (err) {
        console.error("getMARByPatientId error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/mar/prescription/:prescriptionId
const getMARByPrescriptionId = async (req, res) => {
    try {
        const prescription = await Prescription.findByPk(req.params.prescriptionId);
        if (!prescription)
            return res.status(404).json({ success: false, message: "Prescription not found" });

        const entries = await MAR.findAll({
            where: { prescriptionId: req.params.prescriptionId },
            include: [{ model: User, as: "administrator", attributes: ["id", "username"] }],
            order: [["scheduledAt", "ASC"]]
        });

        return res.status(200).json({ success: true, count: entries.length, data: entries });
    } catch (err) {
        console.error("getMARByPrescriptionId error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/mar/missed  — all missed doses across all patients (clinical safety view)
const getMissedDoses = async (req, res) => {
    try {
        const entries = await MAR.findAll({
            where: { status: "Missed" },
            include: [
                { model: Patient,    attributes: ["id", "firstName", "lastName"] },
                { model: Medication, attributes: ["id", "medicationName"] }
            ],
            order: [["scheduledAt", "DESC"]]
        });

        return res.status(200).json({ success: true, count: entries.length, data: entries });
    } catch (err) {
        console.error("getMissedDoses error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// POST /api/mar
const createMAREntry = async (req, res) => {
    const { patientId, prescriptionId, medicationId, scheduledAt, administeredAt, dose, route, status, notes } = req.body;

    const missing = [];
    if (!patientId)      missing.push("patientId");
    if (!prescriptionId) missing.push("prescriptionId");
    if (!medicationId)   missing.push("medicationId");
    if (!scheduledAt)    missing.push("scheduledAt");
    if (!dose)           missing.push("dose");
    if (!route)          missing.push("route");

    if (missing.length > 0)
        return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(", ")}` });

    if (!VALID_ROUTES.includes(route))
        return res.status(400).json({ success: false, message: `Invalid route. Must be one of: ${VALID_ROUTES.join(", ")}` });

    if (status && !VALID_STATUSES.includes(status))
        return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });

    // Notes are required when a dose is Missed, Refused, or Held
    const requiresNotes = ["Missed", "Refused", "Held"];
    if (requiresNotes.includes(status) && !notes)
        return res.status(400).json({ success: false, message: `Notes are required when status is "${status}" — document the reason` });

    try {
        const patient = await Patient.findByPk(patientId);
        if (!patient)
            return res.status(404).json({ success: false, message: "Patient not found" });

        const prescription = await Prescription.findByPk(prescriptionId);
        if (!prescription)
            return res.status(404).json({ success: false, message: "Prescription not found" });

        if (prescription.status !== "Active")
            return res.status(400).json({ success: false, message: `Cannot record MAR entry for a prescription with status "${prescription.status}"` });

        if (prescription.patientId !== parseInt(patientId))
            return res.status(400).json({ success: false, message: "Prescription does not belong to this patient" });

        const medication = await Medication.findByPk(medicationId);
        if (!medication)
            return res.status(404).json({ success: false, message: "Medication not found" });

        if (!medication.isActive)
            return res.status(400).json({ success: false, message: "Cannot record MAR entry for an inactive medication" });

        if (medication.id !== prescription.medicationId)
            return res.status(400).json({ success: false, message: "Medication does not match the prescription" });

        // Safeguard: Prevent duplicate administration entries for the same dose (Real-life safety)
        if (status === "Given") {
            const existingEntry = await MAR.findOne({
                where: {
                    prescriptionId,
                    scheduledAt,
                    status: "Given"
                }
            });
            if (existingEntry) {
                return res.status(409).json({ 
                    success: false, 
                    message: `A medication dose for this prescription at ${scheduledAt} has already been recorded as "Given". Duplicate administration blocked.`
                });
            }
        }

        const entry = await MAR.create({
            patientId,
            prescriptionId,
            medicationId,
            administeredBy: req.user.userId,
            scheduledAt,
            administeredAt: administeredAt || null,
            dose,
            route,
            status:  status || "Given",
            notes:   notes  || null
        });

        return res.status(201).json({ success: true, data: entry });
    } catch (err) {
        console.error("createMAREntry error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// PUT /api/mar/:id
const updateMAREntry = async (req, res) => {
    try {
        const entry = await MAR.findByPk(req.params.id);
        if (!entry)
            return res.status(404).json({ success: false, message: "MAR entry not found" });

        if (req.body.status && !VALID_STATUSES.includes(req.body.status))
            return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });

        if (req.body.route && !VALID_ROUTES.includes(req.body.route))
            return res.status(400).json({ success: false, message: `Invalid route. Must be one of: ${VALID_ROUTES.join(", ")}` });

        // Prevent FK overrides
        const { patientId: _, prescriptionId: __, medicationId: ___, administeredBy: ____, ...updateData } = req.body;
        await entry.update(updateData);

        return res.status(200).json({ success: true, data: entry });
    } catch (err) {
        console.error("updateMAREntry error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export {
    getAllMAREntries,
    getMAREntryById,
    getMARByPatientId,
    getMARByPrescriptionId,
    getMissedDoses,
    createMAREntry,
    updateMAREntry
};
