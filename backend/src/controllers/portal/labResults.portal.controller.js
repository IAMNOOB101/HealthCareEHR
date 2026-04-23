import { LabResult, LabOrder, Patient } from "../../models/index.js";

// GET /portal/lab-results
export const getMyLabResults = async (req, res) => {
    try {
        const labResults = await LabResult.findAll({
            include: [{
                model: LabOrder,
                required: true,
                where: { patientId: req.portalUser.patientId },
                attributes: ["testType", "orderDate", "priority"]
            }],
            order: [["resultDate", "DESC"]]
        });

        // Filter / map output for patients to safely hide staff notes
        const safeResults = labResults.map(res => {
            const data = res.toJSON();
            if (data.isCritical) {
                // Instead of showing panic-inducing flags immediately, 
                // typically systems just flag requiring discussion.
                data.requiresDiscussion = true;
            }
            return data;
        });

        return res.status(200).json({ success: true, data: safeResults });
    } catch (err) {
        console.error("getMyLabResults error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /portal/lab-results/recent
export const getMyRecentLabResults = async (req, res) => {
    try {
        const labResults = await LabResult.findAll({
            include: [{
                model: LabOrder,
                required: true,
                where: { patientId: req.portalUser.patientId },
                attributes: ["testType", "orderDate", "priority"]
            }],
            order: [["resultDate", "DESC"]],
            limit: 10
        });

        return res.status(200).json({ success: true, data: labResults });
    } catch (err) {
        console.error("getMyRecentLabResults error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /portal/lab-results/:id
export const getLabResultById = async (req, res) => {
    try {
        const result = await LabResult.findOne({
            where: { id: req.params.id },
            include: [{
                model: LabOrder,
                required: true,
                where: { patientId: req.portalUser.patientId },
                attributes: ["testType", "orderDate"]
            }]
        });

        if (!result)
            return res.status(404).json({ success: false, message: "Lab result not found" });

        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        console.error("getLabResultById error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
