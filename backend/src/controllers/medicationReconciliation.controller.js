import { Patient, Prescription, Medication, User, EncounterNote } from "../models/index.js";
import MedicationReconciliation from "../models/medicationReconciliation.model.js";

// GET /api/medication-reconciliation
const getAllReconciliations = async (req, res) => {
    const { patientId, reconciledBy, status } = req.query;

    try {
        const where = {};
        if (patientId)   where.patientId   = patientId;
        if (reconciledBy) where.reconciledBy = reconciledBy;
        if (status)      where.status      = status;

        const records = await MedicationReconciliation.findAll({
            where,
            include: [
                { model: Patient, attributes: ["id", "firstName", "lastName"] },
                { model: User,    as: "reconciler", attributes: ["id", "username"] }
            ],
            order: [["reconciledAt", "DESC"]]
        });

        return res.status(200).json({ success: true, count: records.length, data: records });
    } catch (err) {
        console.error("getAllReconciliations error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/medication-reconciliation/:id
const getReconciliationById = async (req, res) => {
    try {
        const record = await MedicationReconciliation.findByPk(req.params.id, {
            include: [
                { model: Patient,       attributes: ["id", "firstName", "lastName"] },
                { model: User,          as: "reconciler", attributes: ["id", "username"] },
                { model: EncounterNote, attributes: ["id", "encounterDate", "chiefComplaint"], required: false }
            ]
        });

        if (!record)
            return res.status(404).json({ success: false, message: "Reconciliation record not found" });

        return res.status(200).json({ success: true, data: record });
    } catch (err) {
        console.error("getReconciliationById error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/medication-reconciliation/patient/:patientId
const getReconciliationsByPatientId = async (req, res) => {
    try {
        const patient = await Patient.findByPk(req.params.patientId);
        if (!patient)
            return res.status(404).json({ success: false, message: "Patient not found" });

        const records = await MedicationReconciliation.findAll({
            where: { patientId: req.params.patientId },
            include: [{ model: User, as: "reconciler", attributes: ["id", "username"] }],
            order: [["reconciledAt", "DESC"]]
        });

        return res.status(200).json({ success: true, count: records.length, data: records });
    } catch (err) {
        console.error("getReconciliationsByPatientId error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// POST /api/medication-reconciliation
const createReconciliation = async (req, res) => {
    const { patientId, encounterId, reconciledAt, medicationsBefore, notes } = req.body;

    const missing = [];
    if (!patientId)         missing.push("patientId");
    if (!reconciledAt)      missing.push("reconciledAt");
    if (!medicationsBefore) missing.push("medicationsBefore");

    if (missing.length > 0)
        return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(", ")}` });

    if (!Array.isArray(medicationsBefore))
        return res.status(400).json({ success: false, message: "medicationsBefore must be an array" });

    try {
        const patient = await Patient.findByPk(patientId);
        if (!patient)
            return res.status(404).json({ success: false, message: "Patient not found" });

        // Validate optional encounter link
        if (encounterId) {
            const encounter = await EncounterNote.findByPk(encounterId);
            if (!encounter)
                return res.status(404).json({ success: false, message: "Encounter note not found" });
            if (encounter.patientId !== parseInt(patientId))
                return res.status(400).json({ success: false, message: "Encounter does not belong to this patient" });
        }

        // Pull current active prescriptions from DB (the "after" state)
        const activePrescriptions = await Prescription.findAll({
            where: { patientId, status: "Active" },
            include: [{ model: Medication, attributes: ["id", "medicationName", "contraindications"] }]
        });

        const medicationsAfter = activePrescriptions.map(p => ({
            prescriptionId: p.id,
            medicationId:   p.medicationId,
            medicationName: p.Medication?.medicationName,
            dosage:         p.dosage,
            frequency:      p.frequency,
            status:         p.status
        }));

        // Auto-compute discrepancies
        const discrepancies = computeDiscrepancies(medicationsBefore, medicationsAfter, activePrescriptions);

        const record = await MedicationReconciliation.create({
            patientId,
            reconciledBy:  req.user.userId,
            encounterId:   encounterId || null,
            reconciledAt,
            medicationsBefore,
            medicationsAfter,
            discrepancies,
            notes: notes || null
        });

        return res.status(201).json({
            success: true,
            data: record,
            summary: {
                totalBefore:       medicationsBefore.length,
                totalAfter:        medicationsAfter.length,
                totalDiscrepancies: discrepancies.length
            }
        });
    } catch (err) {
        console.error("createReconciliation error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// PUT /api/medication-reconciliation/:id
const updateReconciliation = async (req, res) => {
    try {
        const record = await MedicationReconciliation.findByPk(req.params.id);
        if (!record)
            return res.status(404).json({ success: false, message: "Reconciliation record not found" });

        if (record.status === "Completed")
            return res.status(400).json({ success: false, message: "Cannot update a completed reconciliation" });

        // Prevent FK overrides
        const { patientId: _, reconciledBy: __, ...updateData } = req.body;
        await record.update(updateData);

        return res.status(200).json({ success: true, data: record });
    } catch (err) {
        console.error("updateReconciliation error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ─── Internal Helper: Auto-Compute Discrepancies ─────────────────────────────
/**
 * Compares medicationsBefore (self-reported) with medicationsAfter (DB active prescriptions)
 * and returns a list of clinical discrepancies.
 *
 * Types:
 *  - "omission"  → patient was on a drug before, but it's not in current prescriptions
 *  - "addition"  → drug is newly prescribed, was not in patient's before list
 *  - "duplicate" → same drug name appears in both lists (possible double-prescribing)
 *  - "conflict"  → contraindication detected between a before-med and an after-med
 */
const computeDiscrepancies = (before, after, prescriptions) => {
    const discrepancies = [];

    const beforeNames = before.map(m => m.medicationName?.toLowerCase().trim()).filter(Boolean);
    const afterNames  = after.map(m => m.medicationName?.toLowerCase().trim()).filter(Boolean);

    // Omissions: in before but not in after
    for (const bMed of before) {
        const name = bMed.medicationName?.toLowerCase().trim();
        if (name && !afterNames.includes(name)) {
            discrepancies.push({
                type:     "omission",
                details:  `"${bMed.medicationName}" was taken before but is not in current prescriptions`,
                resolved: false
            });
        }
    }

    // Additions: in after but not in before
    for (const aMed of after) {
        const name = aMed.medicationName?.toLowerCase().trim();
        if (name && !beforeNames.includes(name)) {
            discrepancies.push({
                type:     "addition",
                details:  `"${aMed.medicationName}" is newly prescribed and was not in prior medication list`,
                resolved: false
            });
        }
    }

    // Duplicates: same drug in both lists
    for (const name of beforeNames) {
        if (afterNames.includes(name)) {
            discrepancies.push({
                type:     "duplicate",
                details:  `"${name}" appears in both prior and current medication lists — verify intended continuation`,
                resolved: false
            });
        }
    }

    // Conflicts: check contraindications between before-meds and active prescriptions
    for (const prescription of prescriptions) {
        const contraindications = prescription.Medication?.contraindications || [];
        for (const bMed of before) {
            const bName = bMed.medicationName?.toLowerCase().trim();
            if (contraindications.some(c => c.toLowerCase() === bName)) {
                discrepancies.push({
                    type:     "conflict",
                    details:  `"${prescription.Medication?.medicationName}" is contraindicated with prior medication "${bMed.medicationName}"`,
                    resolved: false
                });
            }
        }
    }

    return discrepancies;
};

export {
    getAllReconciliations,
    getReconciliationById,
    getReconciliationsByPatientId,
    createReconciliation,
    updateReconciliation
};
