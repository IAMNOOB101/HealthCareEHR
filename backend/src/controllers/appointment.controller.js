import { Op } from "sequelize";
import { Appointment, Patient, Doctor } from "../models/index.js";
import { getPagination, getPagingData } from "../utils/pagination.js";

const VALID_TYPES    = ["Consultation", "Follow-up", "Emergency", "Routine Check-up"];
const VALID_STATUSES = ["Scheduled", "Completed", "Cancelled", "No-Show"];

// GET /api/appointments
const getAllAppointments = async (req, res) => {
    const { patientId, doctorId, status, appointmentType } = req.query;

    try {
        const where = {};
        if (patientId)       where.patientId       = patientId;
        if (doctorId)        where.doctorId        = doctorId;
        if (status)          where.status          = status;
        if (appointmentType) where.appointmentType = appointmentType;

        const { limit, offset, page } = getPagination(req.query, 50);

        const data = await Appointment.findAndCountAll({
            where,
            include: [
                { model: Patient, attributes: ["id", "firstName", "lastName"] },
                { model: Doctor,  attributes: ["id", "firstName", "lastName", "specialization"] }
            ],
            order: [["appointmentDate", "DESC"]],
            limit,
            offset
        });

        const response = getPagingData(data, page, limit);
        return res.status(200).json({ success: true, ...response });
    } catch (err) {
        console.error("getAllAppointments error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/appointments/:id
const getAppointmentById = async (req, res) => {
    try {
        const appointment = await Appointment.findByPk(req.params.id, {
            include: [
                { model: Patient, attributes: ["id", "firstName", "lastName"] },
                { model: Doctor,  attributes: ["id", "firstName", "lastName", "specialization"] }
            ]
        });
        if (!appointment)
            return res.status(404).json({ success: false, message: "Appointment not found" });

        return res.status(200).json({ success: true, data: appointment });
    } catch (err) {
        console.error("getAppointmentById error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/appointments/patient/:patientId
const getAppointmentByPatientId = async (req, res) => {
    try {
        const patient = await Patient.findByPk(req.params.patientId);
        if (!patient)
            return res.status(404).json({ success: false, message: "Patient not found" });

        const { limit, offset, page } = getPagination(req.query, 50);

        const data = await Appointment.findAndCountAll({
            where: { patientId: req.params.patientId },
            include: [{ model: Doctor, attributes: ["id", "firstName", "lastName", "specialization"] }],
            order: [["appointmentDate", "DESC"]],
            limit,
            offset
        });

        const response = getPagingData(data, page, limit);
        return res.status(200).json({ success: true, ...response });
    } catch (err) {
        console.error("getAppointmentByPatientId error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/appointments/doctor/:doctorId
const getAppointmentByDoctorId = async (req, res) => {
    try {
        const doctor = await Doctor.findByPk(req.params.doctorId);
        if (!doctor)
            return res.status(404).json({ success: false, message: "Doctor not found" });

        const { limit, offset, page } = getPagination(req.query, 50);

        const data = await Appointment.findAndCountAll({
            where: { doctorId: req.params.doctorId },
            include: [{ model: Patient, attributes: ["id", "firstName", "lastName"] }],
            order: [["appointmentDate", "DESC"]],
            limit,
            offset
        });

        const response = getPagingData(data, page, limit);
        return res.status(200).json({ success: true, ...response });
    } catch (err) {
        console.error("getAppointmentByDoctorId error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// POST /api/appointments
const createAppointmentHandler = async (req, res) => {
    const { patientId, doctorId, appointmentDate, appointmentType, status, notes } = req.body;

    const missing = [];
    if (!patientId)       missing.push("patientId");
    if (!doctorId)        missing.push("doctorId");
    if (!appointmentDate)  missing.push("appointmentDate");
    if (!appointmentType)  missing.push("appointmentType");

    if (missing.length > 0)
        return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(", ")}` });

    if (!VALID_TYPES.includes(appointmentType))
        return res.status(400).json({ success: false, message: `Invalid appointmentType. Must be one of: ${VALID_TYPES.join(", ")}` });

    if (status && !VALID_STATUSES.includes(status))
        return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });

    try {
        const patient = await Patient.findByPk(patientId);
        if (!patient)
            return res.status(404).json({ success: false, message: "Patient not found" });

        const doctor = await Doctor.findByPk(doctorId);
        if (!doctor)
            return res.status(404).json({ success: false, message: "Doctor not found" });

        if (!doctor.isActive)
            return res.status(400).json({ success: false, message: "Doctor is not active" });

        // Check for scheduling conflicts (Real-life: 15-minute buffer)
        const dateObj = new Date(appointmentDate);
        const bufferMillis = 15 * 60 * 1000;
        const windowStart = new Date(dateObj.getTime() - bufferMillis);
        const windowEnd   = new Date(dateObj.getTime() + bufferMillis);

        const conflict = await Appointment.findOne({
            where: {
                doctorId,
                status: "Scheduled",
                appointmentDate: {
                    [Op.between]: [windowStart, windowEnd]
                }
            }
        });

        if (conflict)
            return res.status(409).json({ 
                success: false, 
                message: "Doctor has another scheduled appointment within a 15-minute window of this request." 
            });

        const appointment = await Appointment.create({
            patientId, doctorId, appointmentDate,
            appointmentType,
            status: status || "Scheduled",
            notes
        });

        return res.status(201).json({ success: true, data: appointment });
    } catch (err) {
        console.error("createAppointment error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// PUT /api/appointments/:id
const updateAppointment = async (req, res) => {
    try {
        const appointment = await Appointment.findByPk(req.params.id);
        if (!appointment)
            return res.status(404).json({ success: false, message: "Appointment not found" });

        if (req.body.status && !VALID_STATUSES.includes(req.body.status))
            return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });

        await appointment.update(req.body);
        return res.status(200).json({ success: true, data: appointment });
    } catch (err) {
        console.error("updateAppointment error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// DELETE /api/appointments/:id  (soft cancel)
const deleteAppointment = async (req, res) => {
    try {
        const appointment = await Appointment.findByPk(req.params.id);
        if (!appointment)
            return res.status(404).json({ success: false, message: "Appointment not found" });

        await appointment.update({ status: "Cancelled" });
        return res.status(200).json({ success: true, message: "Appointment cancelled successfully" });
    } catch (err) {
        console.error("deleteAppointment error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export {
    getAllAppointments,
    getAppointmentById,
    getAppointmentByPatientId,
    getAppointmentByDoctorId,
    createAppointmentHandler,
    updateAppointment,
    deleteAppointment
};
