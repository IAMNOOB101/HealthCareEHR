import { ImagingOrder, Patient, Doctor, EncounterNote, sequelize } from "../models/index.js";
import integrations from "../integrations/index.js";
import { getPagination, getPagingData } from "../utils/pagination.js";
import GlobalTaskQueue from "../services/queue.service.js";

const VALID_IMAGING_TYPES = ["X-Ray", "MRI", "CT Scan", "Ultrasound", "PET Scan", "Mammography", "Echocardiogram"];
const VALID_PRIORITIES     = ["Routine", "Urgent", "STAT"];
const TERMINAL_STATUSES    = ["Completed", "Cancelled"];

// GET /api/imaging-orders
const getAllImagingOrders = async (req, res) => {
    const { patientId, doctorId, imagingType, priority, status } = req.query;

    try {
        const where = {};
        if (patientId)   where.patientId   = patientId;
        if (doctorId)    where.doctorId    = doctorId;
        if (imagingType) where.imagingType = imagingType;
        if (priority)    where.priority    = priority;
        if (status)      where.status      = status;

        const { limit, offset, page } = getPagination(req.query, 50);

        const data = await ImagingOrder.findAndCountAll({
            where,
            include: [
                { model: Patient,       attributes: ["id", "firstName", "lastName"] },
                { model: Doctor,        attributes: ["id", "firstName", "lastName", "specialization"] },
                { model: EncounterNote, as: "encounter", attributes: ["id", "encounterDate", "chiefComplaint"], required: false }
            ],
            order: [["createdAt", "DESC"]],
            limit,
            offset
        });

        const response = getPagingData(data, page, limit);
        return res.status(200).json({ success: true, ...response });
    } catch (err) {
        console.error("getAllImagingOrders error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/imaging-orders/:id
const getImagingOrderById = async (req, res) => {
    try {
        const order = await ImagingOrder.findByPk(req.params.id, {
            include: [
                { model: Patient,       attributes: ["id", "firstName", "lastName", "dateOfBirth"] },
                { model: Doctor,        attributes: ["id", "firstName", "lastName", "specialization"] },
                { model: EncounterNote, as: "encounter", attributes: ["id", "encounterDate", "chiefComplaint", "diagnosis"], required: false }
            ]
        });

        if (!order)
            return res.status(404).json({ success: false, message: "Imaging order not found" });

        return res.status(200).json({ success: true, data: order });
    } catch (err) {
        console.error("getImagingOrderById error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/imaging-orders/patient/:patientId
const getImagingOrdersByPatientId = async (req, res) => {
    try {
        const patient = await Patient.findByPk(req.params.patientId);
        if (!patient)
            return res.status(404).json({ success: false, message: "Patient not found" });

        const { limit, offset, page } = getPagination(req.query, 50);

        const data = await ImagingOrder.findAndCountAll({
            where: { patientId: req.params.patientId },
            include: [{ model: Doctor, attributes: ["id", "firstName", "lastName", "specialization"] }],
            order: [["createdAt", "DESC"]],
            limit,
            offset
        });

        const response = getPagingData(data, page, limit);
        return res.status(200).json({ success: true, ...response });
    } catch (err) {
        console.error("getImagingOrdersByPatientId error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/imaging-orders/doctor/:doctorId
const getImagingOrdersByDoctorId = async (req, res) => {
    try {
        const doctor = await Doctor.findByPk(req.params.doctorId);
        if (!doctor)
            return res.status(404).json({ success: false, message: "Doctor not found" });

        const { limit, offset, page } = getPagination(req.query, 50);

        const data = await ImagingOrder.findAndCountAll({
            where: { doctorId: req.params.doctorId },
            include: [{ model: Patient, attributes: ["id", "firstName", "lastName"] }],
            order: [["createdAt", "DESC"]],
            limit,
            offset
        });

        const response = getPagingData(data, page, limit);
        return res.status(200).json({ success: true, ...response });
    } catch (err) {
        console.error("getImagingOrdersByDoctorId error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// POST /api/imaging-orders
const createImagingOrderHandler = async (req, res) => {
    const { patientId, doctorId, encounterId, imagingType, bodyPart, priority, clinicalReason, scheduledAt } = req.body;

    const missing = [];
    if (!patientId)   missing.push("patientId");
    if (!doctorId)    missing.push("doctorId");
    if (!imagingType) missing.push("imagingType");
    if (!bodyPart)    missing.push("bodyPart");

    if (missing.length > 0)
        return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(", ")}` });

    if (!VALID_IMAGING_TYPES.includes(imagingType))
        return res.status(400).json({ success: false, message: `Invalid imagingType. Must be one of: ${VALID_IMAGING_TYPES.join(", ")}` });

    if (priority && !VALID_PRIORITIES.includes(priority))
        return res.status(400).json({ success: false, message: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}` });

    try {
        const patient = await Patient.findByPk(patientId);
        if (!patient)
            return res.status(404).json({ success: false, message: "Patient not found" });

        const doctor = await Doctor.findByPk(doctorId);
        if (!doctor)
            return res.status(404).json({ success: false, message: "Doctor not found" });

        // Validate optional encounter link
        if (encounterId) {
            const encounter = await EncounterNote.findByPk(encounterId);
            if (!encounter)
                return res.status(404).json({ success: false, message: "Encounter note not found" });
            if (encounter.patientId !== parseInt(patientId))
                return res.status(400).json({ success: false, message: "Encounter does not belong to this patient" });
        }

        const t = await sequelize.transaction();

        try {
            const order = await ImagingOrder.create({
                patientId, doctorId,
                encounterId:    encounterId || null,
                imagingType,
                bodyPart,
                priority:       priority || "Routine",
                clinicalReason: clinicalReason || null,
                scheduledAt:    scheduledAt || null
            }, { transaction: t });

            await t.commit();

            // [Phase 3] Integration: Offload to background Task Queue
            GlobalTaskQueue.push({
                name: `Sync-ImagingOrder-${order.id}`,
                fn: async () => {
                    const pacsRes = await integrations.pacs.uploadImaging(order.id, {
                        patientId,
                        imagingType,
                        bodyPart,
                        clinicalReason
                    });

                    if (pacsRes.success) {
                        await order.update({ resultUrl: pacsRes.pacsUrl });
                        console.log(`[Queue] Updated ImagingOrder ${order.id} with PACS URL`);
                    }
                }
            });

            return res.status(202).json({ 
                success: true, 
                message: "Imaging order created and queued for PACS synchronization",
                data: order 
            });
            
        } catch (innerErr) {
            if (t) await t.rollback();
            throw innerErr; // Handled by outer catch
        }
    } catch (err) {
        console.error("createImagingOrder error:", err.message || err);
        // Distinguish between mocked adapter failures and real 500s
        if (err.message && err.message.includes("Mock")) {
            return res.status(502).json({ success: false, message: "External PACS Integration Failed. Operation rolled back." });
        }
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// PUT /api/imaging-orders/:id
const updateImagingOrder = async (req, res) => {
    try {
        const order = await ImagingOrder.findByPk(req.params.id);
        if (!order)
            return res.status(404).json({ success: false, message: "Imaging order not found" });

        // Prevent updates on terminal statuses
        if (TERMINAL_STATUSES.includes(order.status))
            return res.status(400).json({ success: false, message: `Cannot update an imaging order with status "${order.status}"` });

        if (req.body.imagingType && !VALID_IMAGING_TYPES.includes(req.body.imagingType))
            return res.status(400).json({ success: false, message: `Invalid imagingType. Must be one of: ${VALID_IMAGING_TYPES.join(", ")}` });

        if (req.body.priority && !VALID_PRIORITIES.includes(req.body.priority))
            return res.status(400).json({ success: false, message: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}` });

        // Prevent FK overrides
        const { patientId: _, doctorId: __, encounterId: ___, ...updateData } = req.body;

        // If status is being set to Completed, auto-set reportedAt
        if (updateData.status === "Completed" && !updateData.reportedAt)
            updateData.reportedAt = new Date();

        await order.update(updateData);
        return res.status(200).json({ success: true, data: order });
    } catch (err) {
        console.error("updateImagingOrder error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// DELETE /api/imaging-orders/:id — hard delete
const cancelImagingOrder = async (req, res) => {
    try {
        const order = await ImagingOrder.findByPk(req.params.id);
        if (!order)
            return res.status(404).json({ success: false, message: "Imaging order not found" });

        await order.destroy({ force: true });
        return res.status(200).json({ success: true, message: "Imaging order deleted successfully" });
    } catch (err) {
        console.error("cancelImagingOrder error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export {
    getAllImagingOrders,
    getImagingOrderById,
    getImagingOrdersByPatientId,
    getImagingOrdersByDoctorId,
    createImagingOrderHandler,
    updateImagingOrder,
    cancelImagingOrder
};
