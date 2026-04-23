import { LabOrder, Patient, Doctor, sequelize } from "../models/index.js";
import integrations from "../integrations/index.js";
import { getPagination, getPagingData } from "../utils/pagination.js";
import GlobalTaskQueue from "../services/queue.service.js";

const VALID_TEST_TYPES = ["Blood Test", "Urine Test", "X-Ray", "MRI", "CT Scan", "Ultrasound", "ECG", "Biopsy"];
const VALID_PRIORITIES = ["Routine", "Urgent", "STAT"];
const VALID_STATUSES   = ["Pending", "In Progress", "Completed", "Cancelled"];

// GET /api/lab-orders
const getAllLabOrders = async (req, res) => {
    const { patientId, doctorId, status, priority, testType } = req.query;

    try {
        const where = {};
        if (patientId) where.patientId = patientId;
        if (doctorId)  where.doctorId  = doctorId;
        if (status)    where.status    = status;
        if (priority)  where.priority  = priority;
        if (testType)  where.testType  = testType;

        const { limit, offset, page } = getPagination(req.query, 50);

        const data = await LabOrder.findAndCountAll({
            where,
            include: [
                { model: Patient, attributes: ["id", "firstName", "lastName"] },
                { model: Doctor,  attributes: ["id", "firstName", "lastName", "specialization"] }
            ],
            order: [["orderDate", "DESC"]],
            limit,
            offset
        });

        const response = getPagingData(data, page, limit);
        return res.status(200).json({ success: true, ...response });
    } catch (err) {
        console.error("getAllLabOrders error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/lab-orders/:id
const getLabOrderById = async (req, res) => {
    try {
        const labOrder = await LabOrder.findByPk(req.params.id, {
            include: [
                { model: Patient, attributes: ["id", "firstName", "lastName"] },
                { model: Doctor,  attributes: ["id", "firstName", "lastName"] }
            ]
        });
        if (!labOrder)
            return res.status(404).json({ success: false, message: "Lab order not found" });

        return res.status(200).json({ success: true, data: labOrder });
    } catch (err) {
        console.error("getLabOrderById error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/lab-orders/patient/:patientId
const getLabOrdersByPatientId = async (req, res) => {
    try {
        const patient = await Patient.findByPk(req.params.patientId);
        if (!patient)
            return res.status(404).json({ success: false, message: "Patient not found" });

        const { limit, offset, page } = getPagination(req.query, 50);

        const data = await LabOrder.findAndCountAll({
            where: { patientId: req.params.patientId },
            include: [{ model: Doctor, attributes: ["id", "firstName", "lastName"] }],
            order: [["orderDate", "DESC"]],
            limit,
            offset
        });

        const response = getPagingData(data, page, limit);
        return res.status(200).json({ success: true, ...response });
    } catch (err) {
        console.error("getLabOrdersByPatientId error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/lab-orders/doctor/:doctorId
const getLabOrdersByDoctorId = async (req, res) => {
    try {
        const doctor = await Doctor.findByPk(req.params.doctorId);
        if (!doctor)
            return res.status(404).json({ success: false, message: "Doctor not found" });

        const { limit, offset, page } = getPagination(req.query, 50);

        const data = await LabOrder.findAndCountAll({
            where: { doctorId: req.params.doctorId },
            include: [{ model: Patient, attributes: ["id", "firstName", "lastName"] }],
            order: [["orderDate", "DESC"]],
            limit,
            offset
        });

        const response = getPagingData(data, page, limit);
        return res.status(200).json({ success: true, ...response });
    } catch (err) {
        console.error("getLabOrdersByDoctorId error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// POST /api/lab-orders
const createLabOrderHandler = async (req, res) => {
    const { patientId, doctorId, testType, testName, orderDate, priority, notes } = req.body;

    const missing = [];
    if (!patientId) missing.push("patientId");
    if (!doctorId)  missing.push("doctorId");
    if (!testType)  missing.push("testType");
    if (!testName)  missing.push("testName"); // require testName now
    if (!orderDate) missing.push("orderDate");

    if (missing.length > 0)
        return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(", ")}` });

    if (!VALID_TEST_TYPES.includes(testType))
        return res.status(400).json({ success: false, message: `Invalid testType. Must be one of: ${VALID_TEST_TYPES.join(", ")}` });

    if (priority && !VALID_PRIORITIES.includes(priority))
        return res.status(400).json({ success: false, message: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}` });

    try {
        const patient = await Patient.findByPk(patientId);
        if (!patient)
            return res.status(404).json({ success: false, message: "Patient not found" });

        const doctor = await Doctor.findByPk(doctorId);
        if (!doctor)
            return res.status(404).json({ success: false, message: "Doctor not found" });
        if (!doctor.isActive)
            return res.status(400).json({ success: false, message: "Doctor is not active" });

        const t = await sequelize.transaction();

        try {
            const labOrder = await LabOrder.create({
                patientId, doctorId, testType, testName, orderDate,
                priority: priority || "Routine",
                notes
            }, { transaction: t });

            await t.commit();

            // [Phase 3] Integration: Offload to background Task Queue
            GlobalTaskQueue.push({
                name: `Sync-LabOrder-${labOrder.id}`,
                fn: () => integrations.lis.sendLabOrder(labOrder)
            });

            return res.status(202).json({ 
                success: true, 
                message: "Lab order created and queued for LIS synchronization",
                data: labOrder 
            });

        } catch (innerErr) {
            if (t) await t.rollback();
            throw innerErr;
        }

    } catch (err) {
        console.error("createLabOrder error:", err.message || err);
        if (err.message && err.message.includes("Mock") || err.message.includes("mock integration")) {
            return res.status(502).json({ success: false, message: "External LIS Integration Failed. Operation rolled back." });
        }
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// PUT /api/lab-orders/:id
const updateLabOrder = async (req, res) => {
    try {
        const labOrder = await LabOrder.findByPk(req.params.id);
        if (!labOrder)
            return res.status(404).json({ success: false, message: "Lab order not found" });

        if (["Completed", "Cancelled"].includes(labOrder.status))
            return res.status(400).json({ success: false, message: `Cannot update a ${labOrder.status} lab order` });

        if (req.body.status && !VALID_STATUSES.includes(req.body.status))
            return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });

        if (req.body.priority && !VALID_PRIORITIES.includes(req.body.priority))
            return res.status(400).json({ success: false, message: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}` });

        // Prevent FK overrides
        const { patientId: _, doctorId: __, ...updateData } = req.body;
        await labOrder.update(updateData);

        return res.status(200).json({ success: true, data: labOrder });
    } catch (err) {
        console.error("updateLabOrder error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// DELETE /api/lab-orders/:id  (hard delete)
const deleteLabOrder = async (req, res) => {
    try {
        const labOrder = await LabOrder.findByPk(req.params.id);
        if (!labOrder)
            return res.status(404).json({ success: false, message: "Lab order not found" });

        await labOrder.destroy({ force: true });
        return res.status(200).json({ success: true, message: "Lab order deleted successfully" });
    } catch (err) {
        console.error("deleteLabOrder error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export {
    getAllLabOrders,
    getLabOrderById,
    getLabOrdersByPatientId,
    getLabOrdersByDoctorId,
    createLabOrderHandler,
    updateLabOrder,
    deleteLabOrder
};