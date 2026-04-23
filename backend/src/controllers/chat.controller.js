/**
 * chat.controller.js
 *
 * REST endpoints that complement the real-time WebSocket layer:
 *  - GET  /portal/chat/doctors               → eligible doctors (appointment-linked, 30 days)
 *  - GET  /portal/chat/history/:doctorId      → paginated conversation history
 *  - PATCH /portal/chat/read/:doctorId        → mark messages read
 *  - GET  /api/chat/patients                  → patients with existing conversations
 *  - GET  /api/chat/eligible-patients         → patients with recent appointments
 *  - GET  /api/chat/all-patients              → ALL portal patients
 *  - GET  /api/chat/history/:portalUserId     → doctor fetches conversation history
 *  - PATCH /api/chat/read/:portalUserId       → mark messages read
 *
 * ── SECURITY ────────────────────────────────────────────────────────────────
 *  • All message bodies are stored as AES-GCM ciphertext. The server NEVER
 *    decrypts them — it only stores and forwards encrypted blobs.
 *  • Chat access is gated by appointment eligibility: only patients and
 *    doctors linked by an appointment (Scheduled or Completed) within the
 *    last 30 days may communicate.
 *  • Admin tokens are rejected at socket connect time (see socket.service.js).
 */

import { Op } from "sequelize";
import { ChatMessage, Doctor, Patient, PortalUser, User, Appointment } from "../models/index.js";
import { getPagination } from "../utils/pagination.js";

// ── Helper: build a unique conversation "room" ID ───────────────────────────
// Format: chat_<patientId>_<doctorId>
export const buildRoomId = (patientId, doctorId) =>
    `chat_${patientId}_${doctorId}`;

// ── Helper: 30-day eligibility window ────────────────────────────────────────
const CHAT_WINDOW_DAYS = 30;

const getChatWindowStart = () => {
    const d = new Date();
    d.setDate(d.getDate() - CHAT_WINDOW_DAYS);
    return d;
};

/**
 * Check if a patient-doctor pair has an eligible appointment
 * (Scheduled or Completed within the last 30 days).
 */
export const isEligiblePair = async (patientId, doctorId) => {
    const count = await Appointment.count({
        where: {
            patientId,
            doctorId,
            status: { [Op.in]: ["Scheduled", "Completed"] },
            appointmentDate: { [Op.gte]: getChatWindowStart() },
        },
    });
    return count > 0;
};

// ────────────────────────────────────────────────────────────────────────────
//  PATIENT-FACING (Portal)
// ────────────────────────────────────────────────────────────────────────────

/**
 * GET /portal/chat/doctors
 * Returns only doctors the patient has an eligible appointment with
 * (Scheduled or Completed, within last 30 days).
 * Includes the chat expiry date (30 days from latest appointment).
 */
export const getAvailableDoctors = async (req, res) => {
    try {
        const { patientId } = req.portalUser;

        // Find distinct doctor IDs from eligible appointments
        const appointments = await Appointment.findAll({
            where: {
                patientId,
                status: { [Op.in]: ["Scheduled", "Completed"] },
                appointmentDate: { [Op.gte]: getChatWindowStart() },
            },
            attributes: ["doctorId", "appointmentDate", "appointmentType", "status"],
            include: [{
                model: Doctor,
                attributes: ["id", "firstName", "lastName", "specialization", "department", "email"],
                where: { isActive: true },
            }],
            order: [["appointmentDate", "DESC"]],
        });

        // Deduplicate by doctorId, keep the latest appointment info
        const doctorMap = new Map();
        for (const appt of appointments) {
            if (!doctorMap.has(appt.doctorId)) {
                const expiryDate = new Date(appt.appointmentDate);
                expiryDate.setDate(expiryDate.getDate() + CHAT_WINDOW_DAYS);
                doctorMap.set(appt.doctorId, {
                    ...appt.Doctor.toJSON(),
                    latestAppointmentDate: appt.appointmentDate,
                    appointmentType: appt.appointmentType,
                    appointmentStatus: appt.status,
                    chatExpiresAt: expiryDate,
                    daysRemaining: Math.max(0, Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24))),
                });
            }
        }

        return res.json({ success: true, data: Array.from(doctorMap.values()) });
    } catch (err) {
        console.error("getAvailableDoctors error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * GET /portal/chat/history/:doctorId
 * Fetches E2E encrypted conversation history between patient and doctor.
 * Only allowed if they share an eligible appointment.
 */
export const getPatientChatHistory = async (req, res) => {
    try {
        const { patientId, portalUserId } = req.portalUser;
        const { doctorId } = req.params;
        const { limit, offset } = getPagination(req.query, 50);

        // Verify eligibility
        const eligible = await isEligiblePair(patientId, Number(doctorId));
        if (!eligible) {
            return res.status(403).json({
                success: false,
                message: "Chat access expired. You need an appointment within the last 30 days to chat with this doctor.",
            });
        }

        const { count, rows } = await ChatMessage.findAndCountAll({
            where: { patientId, portalUserId, doctorId },
            attributes: ["id", "senderType", "ciphertext", "iv", "isRead", "createdAt"],
            order: [["createdAt", "ASC"]],
            limit,
            offset,
        });

        return res.json({
            success: true,
            data: rows,
            meta: {
                totalItems: count,
                totalPages: Math.ceil(count / limit),
                currentPage: parseInt(req.query.page, 10) || 1,
            },
        });
    } catch (err) {
        console.error("getPatientChatHistory error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * PATCH /portal/chat/read/:doctorId
 * Marks all unread messages FROM doctor TO patient as read.
 */
export const markPatientChatRead = async (req, res) => {
    try {
        const { patientId, portalUserId } = req.portalUser;
        const { doctorId } = req.params;

        await ChatMessage.update(
            { isRead: true, readAt: new Date() },
            {
                where: {
                    patientId,
                    portalUserId,
                    doctorId,
                    senderType: "doctor",
                    isRead: false,
                },
            }
        );

        return res.json({ success: true, message: "Marked as read" });
    } catch (err) {
        console.error("markPatientChatRead error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ────────────────────────────────────────────────────────────────────────────
//  DOCTOR / STAFF-FACING (API)
// ────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/chat/patients
 * Returns patients who have active chat conversations with this doctor.
 */
export const getChatPatients = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({
            where: { email: req.user.username },
            attributes: ["id"],
        });

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: "No doctor profile linked to this account.",
            });
        }

        // Distinct (patientId, portalUserId) pairs that have chatted with this doctor
        const pairs = await ChatMessage.findAll({
            where: { doctorId: doctor.id },
            attributes: ["patientId", "portalUserId"],
            group: ["ChatMessage.patientId", "ChatMessage.portalUserId"],
            raw: true,
        });

        // Hydrate each pair with Patient + PortalUser details + eligibility
        const rows = await Promise.all(
            pairs.map(async ({ patientId, portalUserId }) => {
                const [patient, portalUser, eligible] = await Promise.all([
                    Patient.findByPk(patientId, {
                        attributes: ["id", "firstName", "lastName", "dateOfBirth", "gender"],
                    }),
                    PortalUser.findByPk(portalUserId, {
                        attributes: ["id", "email"],
                    }),
                    isEligiblePair(patientId, doctor.id),
                ]);

                // Get latest appointment info
                const latestAppt = await Appointment.findOne({
                    where: {
                        patientId,
                        doctorId: doctor.id,
                        status: { [Op.in]: ["Scheduled", "Completed"] },
                    },
                    order: [["appointmentDate", "DESC"]],
                    attributes: ["appointmentDate", "appointmentType", "status"],
                });

                let chatExpiresAt = null;
                let daysRemaining = 0;
                if (latestAppt) {
                    chatExpiresAt = new Date(latestAppt.appointmentDate);
                    chatExpiresAt.setDate(chatExpiresAt.getDate() + CHAT_WINDOW_DAYS);
                    daysRemaining = Math.max(0, Math.ceil((chatExpiresAt - new Date()) / (1000 * 60 * 60 * 24)));
                }

                return {
                    patientId,
                    portalUserId,
                    Patient: patient,
                    PortalUser: portalUser,
                    eligible,
                    chatExpiresAt,
                    daysRemaining,
                    latestAppointment: latestAppt ? {
                        date: latestAppt.appointmentDate,
                        type: latestAppt.appointmentType,
                        status: latestAppt.status,
                    } : null,
                };
            })
        );

        return res.json({ success: true, data: rows, doctorId: doctor.id });

    } catch (err) {
        console.error("getChatPatients error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * GET /api/chat/eligible-patients
 * Returns patients who have recent appointments (within 30 days) with
 * this doctor and have a portal account, so the doctor can initiate chat.
 */
export const getEligiblePatients = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({
            where: { email: req.user.username },
            attributes: ["id"],
        });

        if (!doctor) {
            return res.status(404).json({ success: false, message: "No doctor profile linked to this account." });
        }

        // Find appointments within the 30-day window
        const appointments = await Appointment.findAll({
            where: {
                doctorId: doctor.id,
                status: { [Op.in]: ["Scheduled", "Completed"] },
                appointmentDate: { [Op.gte]: getChatWindowStart() },
            },
            attributes: ["patientId", "appointmentDate", "appointmentType", "status"],
            include: [{
                model: Patient,
                attributes: ["id", "firstName", "lastName", "dateOfBirth", "gender"],
            }],
            order: [["appointmentDate", "DESC"]],
        });

        // Build unique patient map
        const patientMap = new Map();
        for (const appt of appointments) {
            if (!patientMap.has(appt.patientId)) {
                const expiryDate = new Date(appt.appointmentDate);
                expiryDate.setDate(expiryDate.getDate() + CHAT_WINDOW_DAYS);

                patientMap.set(appt.patientId, {
                    patientId: appt.patientId,
                    Patient: appt.Patient,
                    latestAppointment: {
                        date: appt.appointmentDate,
                        type: appt.appointmentType,
                        status: appt.status,
                    },
                    chatExpiresAt: expiryDate,
                    daysRemaining: Math.max(0, Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24))),
                });
            }
        }

        // Hydrate with PortalUser info (only patients with portal accounts)
        const results = [];
        for (const [patientId, info] of patientMap) {
            const portalUser = await PortalUser.findOne({
                where: { patientId, isActive: true },
                attributes: ["id", "email"],
            });
            if (portalUser) {
                results.push({
                    ...info,
                    portalUserId: portalUser.id,
                    PortalUser: portalUser,
                });
            }
        }

        return res.json({ success: true, data: results, doctorId: doctor.id });
    } catch (err) {
        console.error("getEligiblePatients error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * GET /api/chat/all-patients
 * Returns ALL patients with portal accounts so doctor can view contacts.
 */
export const getAllPortalPatients = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({
            where: { email: req.user.username },
            attributes: ["id"],
        });

        if (!doctor) {
            return res.status(404).json({ success: false, message: "No doctor profile linked to this account." });
        }

        const patients = await PortalUser.findAll({
            where: { isActive: true },
            attributes: ["id", "patientId", "email"],
            include: [{
                model: Patient,
                attributes: ["id", "firstName", "lastName", "dateOfBirth", "gender"],
            }],
            order: [[Patient, "lastName", "ASC"]],
        });

        return res.json({ success: true, data: patients, doctorId: doctor.id });
    } catch (err) {
        console.error("getAllPortalPatients error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * GET /api/chat/history/:portalUserId
 * Doctor fetches E2E encrypted conversation history with a patient.
 */
export const getDoctorChatHistory = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({
            where: { email: req.user.username },
            attributes: ["id"],
        });

        if (!doctor) {
            return res.status(404).json({ success: false, message: "No doctor profile linked." });
        }

        const { portalUserId } = req.params;
        const { limit, offset } = getPagination(req.query, 50);

        const portalUser = await PortalUser.findByPk(portalUserId, { attributes: ["patientId"] });
        if (!portalUser) {
            return res.status(404).json({ success: false, message: "Patient portal account not found." });
        }

        // Verify eligibility
        const eligible = await isEligiblePair(portalUser.patientId, doctor.id);
        if (!eligible) {
            return res.status(403).json({
                success: false,
                message: "Chat access expired. Patient needs an appointment within the last 30 days.",
            });
        }

        const { count, rows } = await ChatMessage.findAndCountAll({
            where: { doctorId: doctor.id, portalUserId, patientId: portalUser.patientId },
            attributes: ["id", "senderType", "ciphertext", "iv", "isRead", "createdAt"],
            order: [["createdAt", "ASC"]],
            limit,
            offset,
        });

        return res.json({
            success: true,
            data: rows,
            doctorId: doctor.id,
            meta: {
                totalItems: count,
                totalPages: Math.ceil(count / limit),
                currentPage: parseInt(req.query.page, 10) || 1,
            },
        });
    } catch (err) {
        console.error("getDoctorChatHistory error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * PATCH /api/chat/read/:portalUserId
 * Marks all unread messages FROM patient TO doctor as read.
 */
export const markDoctorChatRead = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({
            where: { email: req.user.username },
            attributes: ["id"],
        });
        if (!doctor) return res.status(404).json({ success: false, message: "No doctor profile linked." });

        const { portalUserId } = req.params;

        await ChatMessage.update(
            { isRead: true, readAt: new Date() },
            {
                where: {
                    doctorId: doctor.id,
                    portalUserId,
                    senderType: "patient",
                    isRead: false,
                },
            }
        );

        return res.json({ success: true, message: "Marked as read" });
    } catch (err) {
        console.error("markDoctorChatRead error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
