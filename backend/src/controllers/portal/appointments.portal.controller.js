import { Appointment, Doctor } from "../../models/index.js";

// GET /portal/appointments
export const getMyAppointments = async (req, res) => {
    try {
        const appointments = await Appointment.findAll({
            where: { patientId: req.portalUser.patientId, status: "Scheduled" },
            include: [{ model: Doctor, attributes: ["firstName", "lastName", "specialization"] }],
            order: [["appointmentDate", "ASC"]]
        });
        return res.status(200).json({ success: true, data: appointments });
    } catch (err) {
        console.error("getMyAppointments error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /portal/appointments/history
export const getMyAppointmentHistory = async (req, res) => {
    try {
        const { Op } = await import("sequelize");
        const appointments = await Appointment.findAll({
            where: { 
                patientId: req.portalUser.patientId, 
                status: { [Op.in]: ["Completed", "Cancelled", "No Show"] }
            },
            include: [{ model: Doctor, attributes: ["firstName", "lastName", "specialization"] }],
            order: [["appointmentDate", "DESC"]]
        });
        return res.status(200).json({ success: true, data: appointments });
    } catch (err) {
        console.error("getMyAppointmentHistory error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// POST /portal/appointments/request
export const requestAppointment = async (req, res) => {
    try {
        const { doctorId, appointmentDate, appointmentType, reason } = req.body;
        
        // Simulating an async request flow
        const appointment = await Appointment.create({
            patientId: req.portalUser.patientId,
            doctorId,
            appointmentDate,
            appointmentType: appointmentType || "Consultation",
            reason,
            status: "Scheduled" // In a complex EHR this might start as 'Pending'
        });

        return res.status(201).json({ success: true, message: "Appointment requested successfully", data: appointment });
    } catch (err) {
        console.error("requestAppointment error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// PATCH /portal/appointments/:id/cancel
export const cancelAppointment = async (req, res) => {
    try {
        const appointment = await Appointment.findByPk(req.params.id);
        
        if (!appointment)
            return res.status(404).json({ success: false, message: "Appointment not found" });

        // Security check
        if (appointment.patientId !== req.portalUser.patientId)
            return res.status(403).json({ success: false, message: "Unauthorized action" });

        if (appointment.status !== "Scheduled")
            return res.status(400).json({ success: false, message: "Only scheduled appointments can be cancelled" });

        await appointment.update({ status: "Cancelled" });
        return res.status(200).json({ success: true, message: "Appointment cancelled" });
    } catch (err) {
        console.error("cancelAppointment error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
