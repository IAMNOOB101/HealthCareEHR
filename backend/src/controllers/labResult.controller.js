import { LabResult, LabOrder, Patient, sequelize } from "../models/index.js";
import { sendCriticalResultAlert } from "../utils/notificationService.js";
import { getPagination, getPagingData } from "../utils/pagination.js";

const VALID_STATUSES = ["Normal", "Abnormal", "Critical"];

// GET /api/lab-results
const getAllLabResults = async (req, res) => {
    const { labOrderId, status } = req.query;

    try {
        const where = {};
        if (labOrderId) where.labOrderId = labOrderId;
        if (status)     where.status     = status;

        const { limit, offset, page } = getPagination(req.query, 50);

        const data = await LabResult.findAndCountAll({
            where,
            include: [{ model: LabOrder, attributes: ["id", "testType", "orderDate", "patientId", "doctorId"] }],
            order: [["resultDate", "DESC"]],
            limit,
            offset
        });

        const response = getPagingData(data, page, limit);
        return res.status(200).json({ success: true, ...response });
    } catch (err) {
        console.error("getAllLabResults error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/lab-results/:id
const getLabResultById = async (req, res) => {
    try {
        const result = await LabResult.findByPk(req.params.id, {
            include: [{ model: LabOrder, attributes: ["id", "testType", "orderDate"] }]
        });
        if (!result)
            return res.status(404).json({ success: false, message: "Lab result not found" });

        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        console.error("getLabResultById error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/lab-results/order/:labOrderId
const getLabResultsByOrderId = async (req, res) => {
    try {
        const labOrder = await LabOrder.findByPk(req.params.labOrderId);
        if (!labOrder)
            return res.status(404).json({ success: false, message: "Lab order not found" });

        const { limit, offset, page } = getPagination(req.query, 50);

        const data = await LabResult.findAndCountAll({ 
            where: { labOrderId: req.params.labOrderId },
            limit,
            offset
        });

        const response = getPagingData(data, page, limit);
        return res.status(200).json({ success: true, ...response });
    } catch (err) {
        console.error("getLabResultsByOrderId error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/lab-results/critical
const getCriticalLabResults = async (req, res) => {
    try {
        const { limit, offset, page } = getPagination(req.query, 50);

        const data = await LabResult.findAndCountAll({
            where: { isCritical: true },
            include: [{ model: LabOrder, attributes: ["id", "testType", "patientId", "doctorId"] }],
            order: [["resultDate", "DESC"]],
            limit,
            offset
        });

        const response = getPagingData(data, page, limit);
        return res.status(200).json({ success: true, ...response });
    } catch (err) {
        console.error("getCriticalLabResults error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// POST /api/lab-results
const createLabResultHandler = async (req, res) => {
    const { labOrderId, resultValue, resultDate, unit, referenceRange, status, notes } = req.body;

    const t = await sequelize.transaction();

    try {
        const labOrder = await LabOrder.findByPk(labOrderId);
        if (!labOrder) {
            await t.rollback();
            return res.status(404).json({ success: false, message: "Lab order not found" });
        }

        if (labOrder.status === "Cancelled") {
            await t.rollback();
            return res.status(400).json({ success: false, message: "Cannot add result to a cancelled lab order" });
        }

        // Prevent duplicate result for same lab order
        const exists = await LabResult.findOne({ where: { labOrderId } });
        if (exists) {
            await t.rollback();
            return res.status(409).json({ success: false, message: "A result already exists for this lab order" });
        }

        const isCritical = status === "Critical";

        const labResult = await LabResult.create({
            labOrderId, resultValue, resultDate, unit,
            referenceRange, notes,
            status: status || "Normal",
            isCritical
        }, { transaction: t });

        // Auto-update lab order status to Completed
        await labOrder.update({ status: "Completed" }, { transaction: t });

        await t.commit();

        // Trigger critical result alert
        if (isCritical) sendCriticalResultAlert(labResult, labOrder);

        return res.status(201).json({
            success: true,
            data: labResult,
            ...(isCritical && { alert: "⚠️ Critical result — relevant staff have been notified" })
        });
    } catch (err) {
        await t.rollback();
        console.error("createLabResult error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// PUT /api/lab-results/:id
const updateLabResult = async (req, res) => {
    try {
        const result = await LabResult.findByPk(req.params.id);
        if (!result)
            return res.status(404).json({ success: false, message: "Lab result not found" });

        if (req.body.status && !VALID_STATUSES.includes(req.body.status))
            return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });

        const updatedStatus = req.body.status || result.status;
        const { labOrderId: _, ...updateData } = req.body;

        await result.update({ ...updateData, isCritical: updatedStatus === "Critical" });
        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        console.error("updateLabResult error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// DELETE /api/lab-results/:id
const deleteLabResult = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const result = await LabResult.findByPk(req.params.id);
        if (!result) {
            await t.rollback();
            return res.status(404).json({ success: false, message: "Lab result not found" });
        }

        // Revert lab order status to In Progress
        const labOrder = await LabOrder.findByPk(result.labOrderId);
        if (labOrder) await labOrder.update({ status: "In Progress" }, { transaction: t });

        await result.destroy({ transaction: t });
        
        await t.commit();
        return res.status(200).json({ success: true, message: "Lab result deleted successfully" });
    } catch (err) {
        await t.rollback();
        console.error("deleteLabResult error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export {
    getAllLabResults,
    getLabResultById,
    getLabResultsByOrderId,
    getCriticalLabResults,
    createLabResultHandler,
    updateLabResult,
    deleteLabResult
};