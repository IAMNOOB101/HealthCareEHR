import { Prescription, Doctor, Medication } from "../../models/index.js";

// GET /portal/prescriptions
export const getMyPrescriptions = async (req, res) => {
    try {
        const prescriptions = await Prescription.findAll({
            where: { patientId: req.portalUser.patientId },
            include: [
                { model: Doctor, attributes: ["firstName", "lastName"] },
                { model: Medication, attributes: ["name", "description"] } // Safe fields only
            ],
            order: [["prescriptionDate", "DESC"]]
        });
        return res.status(200).json({ success: true, data: prescriptions });
    } catch (err) {
        console.error("getMyPrescriptions error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /portal/prescriptions/active
export const getMyActivePrescriptions = async (req, res) => {
    try {
        const prescriptions = await Prescription.findAll({
            where: { patientId: req.portalUser.patientId, status: "Active" },
            include: [
                { model: Doctor, attributes: ["firstName", "lastName"] },
                { model: Medication, attributes: ["name", "description"] }
            ],
            order: [["prescriptionDate", "DESC"]]
        });
        return res.status(200).json({ success: true, data: prescriptions });
    } catch (err) {
        console.error("getMyActivePrescriptions error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /portal/prescriptions/:id
export const getPrescriptionById = async (req, res) => {
    try {
        const prescription = await Prescription.findOne({
            where: { id: req.params.id, patientId: req.portalUser.patientId },
            include: [
                { model: Doctor, attributes: ["firstName", "lastName"] },
                { model: Medication, attributes: ["name", "description"] }
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
